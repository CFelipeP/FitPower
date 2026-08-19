<?php

require_once __DIR__ . '/../../vendor/autoload.php';

function guardStripe(): void {
    if (empty(STRIPE_SECRET_KEY)) {
        error('Stripe is not configured on the server', 503);
    }
}

function createCheckoutSession(): void {
    guardStripe();
    $auth = requireAuth();
    $input = getJsonInput();
    $planId = $input['plan_id'] ?? null;
    $billing = $input['billing'] ?? 'monthly';

    if (!in_array($billing, ['monthly', 'yearly'], true)) {
        error('billing must be monthly or yearly', 422);
    }
    if (!$planId) error('Plan ID required');

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found');

    $price = $billing === 'yearly' ? $plan['price_yearly'] : $plan['price_monthly'];
    if (!$price) error('Price not available for selected billing period');

    // Apply a valid coupon to the checkout price. Usage is consumed only in
    // the webhook after payment succeeds.
    $couponCode = isset($input['coupon_code']) ? strtoupper(trim((string)$input['coupon_code'])) : null;
    if ($couponCode !== null && $couponCode !== '') {
        $cStmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)");
        $cStmt->execute([$couponCode]);
        $coupon = $cStmt->fetch();
        if ($coupon) {
            if ($coupon['plan_id'] && (int)$coupon['plan_id'] !== (int)$planId) {
                error('This coupon is not valid for the selected plan', 400);
            }
            $discountAmount = (float)($coupon['discount_amount'] ?? 0);
            $discountPct = (float)($coupon['discount_pct'] ?? 0);
            if ($discountAmount > 0) {
                $price = max(0.5, $price - $discountAmount);
            } elseif ($discountPct > 0) {
                $price = max(0.5, $price * (1 - $discountPct / 100));
            }
        } else {
            error('This coupon is not valid for the selected plan', 422);
        }
    }

    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

    try {
        $userStmt = $db->prepare("SELECT email, stripe_customer_id FROM users WHERE id = ?");
        $userStmt->execute([$auth['sub']]);
        $user = $userStmt->fetch();
        $customerId = $user['stripe_customer_id'];

        if (!$customerId) {
            $customer = \Stripe\Customer::create([
                'email' => $user['email'],
                'metadata' => ['user_id' => $auth['sub']],
            ]);
            $customerId = $customer->id;
            $db->prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")->execute([$customerId, $auth['sub']]);
        }

        $session = \Stripe\Checkout\Session::create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'product_data' => [
                        'name' => $plan['name'] . ' (' . ($billing === 'yearly' ? 'Yearly' : 'Monthly') . ')',
                        'description' => $plan['description'] ?? '',
                    ],
                    'unit_amount' => round($price * 100),
                    'recurring' => ['interval' => $billing === 'yearly' ? 'year' : 'month'],
                ],
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => APP_URL . '/payment/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => APP_URL . '/payment/cancel',
            'metadata' => [
                'user_id' => $auth['sub'],
                'plan_id' => $planId,
                'billing' => $billing,
                'coupon_code' => $couponCode ?? '',
            ],
        ]);

        success(['url' => $session->url, 'session_id' => $session->id]);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}

function handleWebhook(): void {
    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
    $payload = @file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    try {
        $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
    } catch (\Exception $e) {
        http_response_code(400);
        exit;
    }

    $db = getDB();

    switch ($event->type) {
        case 'checkout.session.completed':
            $session = $event->data->object;
            $userId = $session->metadata->user_id;
            $planId = $session->metadata->plan_id;
            $billing = $session->metadata->billing;
            $stripeSubId = $session->subscription;
            $interval = $billing === 'yearly' ? 'YEAR' : 'MONTH';

            // Idempotency: never process the same checkout session twice.
            $dupStmt = $db->prepare("SELECT id FROM payments WHERE checkout_session_id = ? LIMIT 1");
            $dupStmt->execute([$session->id]);
            if ($dupStmt->fetchColumn()) {
                break;
            }

            $db->beginTransaction();
            try {
                $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status = 'active'")
                    ->execute([$userId]);

                $stmt = $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, stripe_subscription_id, billing, status, starts_at, ends_at)
                    VALUES (?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval))");
                $stmt->execute([$userId, $planId, $stripeSubId, $billing]);
                $subId = (int)$db->lastInsertId();

                $amount = $session->amount_total / 100;
                $stmt = $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, method, type, status, checkout_session_id)
                    VALUES (?, ?, ?, 'card', 'subscription', 'completed', ?)");
                $stmt->execute([$userId, $subId, $amount, $session->id]);

                // Coupon usage is consumed only after payment succeeds.
                $couponCode = trim((string)($session->metadata->coupon_code ?? ''));
                if ($couponCode !== '') {
                    $db->prepare("UPDATE coupons SET current_uses = current_uses + 1 WHERE code = ? AND is_active = 1")
                        ->execute([$couponCode]);
                }

                $db->commit();
            } catch (\Throwable $e) {
                $db->rollBack();
                error_log('stripe webhook checkout.session.completed failed: ' . $e->getMessage());
            }
            break;

        case 'customer.subscription.deleted':
            $sub = $event->data->object;
            $stripeSubId = $sub->id;
            $stmt = $db->prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ?");
            $stmt->execute([$stripeSubId]);
            break;
    }

    http_response_code(200);
}

function getStripePublishableKey(): void {
    success(['publishable_key' => STRIPE_PUBLISHABLE_KEY]);
}

function createBillingPortal(): void {
    guardStripe();
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT stripe_customer_id FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();
    if (!$user || empty($user['stripe_customer_id'])) {
        error('No Stripe billing profile found for your account', 404);
    }

    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
    try {
        $session = \Stripe\BillingPortal\Session::create([
            'customer' => $user['stripe_customer_id'],
            'return_url' => APP_URL . '/plans',
        ]);
        success(['url' => $session->url]);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}

function cancelSubscription(): void {
    guardStripe();
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_subscriptions WHERE user_id = ? AND status = 'active'");
    $stmt->execute([$auth['sub']]);
    $subscription = $stmt->fetch();

    if (!$subscription) error('No active subscription found');

    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

    try {
        $stripeSub = \Stripe\Subscription::retrieve($subscription['stripe_subscription_id']);
        $stripeSub->cancel();

        $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?")
            ->execute([$subscription['id']]);

        success(['message' => 'Subscription cancelled successfully']);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}

function getCheckoutSession(): void {
    guardStripe();
    $auth = requireAuth();
    $sessionId = $_GET['session_id'] ?? null;
    if (!$sessionId) error('Session ID required');

    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

    try {
        $session = \Stripe\Checkout\Session::retrieve($sessionId);

        // Only the owner of the session (or an admin) may read its details.
        $ownerId = (int)($session->metadata->user_id ?? 0);
        if ($ownerId !== (int)$auth['sub'] && $auth['role'] !== 'admin') {
            error('This checkout session does not belong to your account', 403);
        }

        $lineItems = \Stripe\Checkout\Session::allLineItems($sessionId, ['limit' => 1]);
        $planName = $lineItems->data[0]->description ?? '';

        success([
            'plan_name' => $planName,
            'amount' => ($session->amount_total ?? 0) / 100,
            'customer_email' => $session->customer_details->email ?? '',
        ]);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}
