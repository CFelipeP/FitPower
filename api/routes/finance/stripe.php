<?php

require_once __DIR__ . '/../../vendor/autoload.php';

function createCheckoutSession(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $planId = $input['plan_id'] ?? null;
    $billing = $input['billing'] ?? 'monthly';

    if (!$planId) error('Plan ID required');

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found');

    $price = $billing === 'yearly' ? $plan['price_yearly'] : $plan['price_monthly'];
    if (!$price) error('Price not available for selected billing period');

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

            $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status = 'active'")
                ->execute([$userId]);

            $stmt = $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, stripe_subscription_id, billing, status, starts_at, ends_at)
                VALUES (?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval))");
            $stmt->execute([$userId, $planId, $stripeSubId, $billing]);
            $subId = (int)$db->lastInsertId();

            $amount = $session->amount_total / 100;
            $stmt = $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, method, type, status)
                VALUES (?, ?, ?, 'card', 'subscription', 'completed')");
            $stmt->execute([$userId, $subId, $amount]);
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
