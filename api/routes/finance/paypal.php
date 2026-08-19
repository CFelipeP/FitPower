<?php

function getPayPalAccessToken(): string
{
    $clientId = defined('PAYPAL_CLIENT_ID') ? PAYPAL_CLIENT_ID : '';
    $secret = defined('PAYPAL_CLIENT_SECRET') ? PAYPAL_CLIENT_SECRET : '';
    if (!$clientId || !$secret || str_contains($clientId, 'placeholder') || str_contains($secret, 'placeholder')) {
        error('PayPal is not configured on the server', 503);
    }

    $baseUrl = defined('PAYPAL_API_BASE') ? PAYPAL_API_BASE : 'https://api-m.sandbox.paypal.com';
    $ch = curl_init("$baseUrl/v1/oauth2/token");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
        CURLOPT_USERPWD => "$clientId:$secret",
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200) {
        error('PayPal auth failed', 500);
    }

    $data = json_decode($res, true);
    return $data['access_token'] ?? '';
}

function paypalApi(string $method, string $path, ?array $body = null): array
{
    $token = getPayPalAccessToken();
    $baseUrl = defined('PAYPAL_API_BASE') ? PAYPAL_API_BASE : 'https://api-m.sandbox.paypal.com';
    $url = $baseUrl . $path;

    $headers = [
        'Content-Type: application/json',
        "Authorization: Bearer $token",
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($res, true);
    if (!is_array($data)) {
        $data = ['_raw' => $res];
    }
    $data['_http_code'] = $code;
    return $data;
}

function getPayPalConfig(): void
{
    $clientId = defined('PAYPAL_CLIENT_ID') ? PAYPAL_CLIENT_ID : '';
    success(['client_id' => $clientId]);
}

/**
 * One-time PayPal purchases never auto-renew: flip overdue rows to 'expired'
 * so entitlements and the user's plan view stay honest. Stripe-backed
 * subscriptions are managed by Stripe webhooks and are never touched here.
 */
function expireOverdueSubscriptions(PDO $db, int $userId): void
{
    $db->prepare("
        UPDATE user_subscriptions
        SET status = 'expired'
        WHERE user_id = ?
        AND status = 'active'
        AND ends_at IS NOT NULL AND ends_at < NOW()
        AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
    ")->execute([$userId]);
}

function createPayPalOrder(): void
{
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

    $coupon = isset($input['coupon_code']) ? strtoupper(trim((string)$input['coupon_code'])) : null;
    $discountPct = 0;
    $discountAmount = 0;
    $couponId = null;

    if ($coupon) {
        $cStmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())");
        $cStmt->execute([$coupon]);
        $couponRow = $cStmt->fetch();
        if ($couponRow) {
            if ($couponRow['max_uses'] !== null && (int)$couponRow['current_uses'] >= (int)$couponRow['max_uses']) {
                error('This coupon has reached its usage limit', 400);
            }
            if ($couponRow['plan_id'] && (int)$couponRow['plan_id'] !== (int)$planId) {
                error('This coupon is not valid for the selected plan', 400);
            }
            $discountPct = (float)($couponRow['discount_pct'] ?? 0);
            $discountAmount = (float)($couponRow['discount_amount'] ?? 0);
            $couponId = (int)$couponRow['id'];
        } else {
            error('This coupon is not valid for the selected plan', 422);
        }
    }

    $finalPrice = max(0.5, $price - ($discountAmount > 0 ? $discountAmount : $price * $discountPct / 100));
    $finalPrice = round($finalPrice, 2);

    $planLabel = $plan['name'] . ' (' . ($billing === 'yearly' ? 'Yearly' : 'Monthly') . ')';

    // The custom_id lets the webhook map a capture back to this exact order.
    $customId = "fp_u{$auth['sub']}_p{$planId}_{$billing}";

    $orderData = [
        'intent' => 'CAPTURE',
        'purchase_units' => [[
            'custom_id' => $customId,
            'amount' => [
                'currency_code' => 'USD',
                'value' => number_format($finalPrice, 2, '.', ''),
            ],
            'description' => $planLabel,
        ]],
        'application_context' => [
            'brand_name' => 'FitPower',
            'shipping_preference' => 'NO_SHIPPING',
            'user_action' => 'PAY_NOW',
            'return_url' => APP_URL . '/payment/success',
            'cancel_url' => APP_URL . '/payment/cancel',
        ],
    ];

    $res = paypalApi('POST', '/v2/checkout/orders', $orderData);

    if (($res['_http_code'] ?? 0) !== 201 || empty($res['id'])) {
        error('Could not create the PayPal order. Please try again.', 502);
    }

    // Track the order so the capture endpoint can recover plan/coupon from
    // the order id alone (PayPal return URL carries only the token).
    $db->prepare("INSERT INTO paypal_orders (order_id, user_id, plan_id, billing, coupon, amount, status) VALUES (?, ?, ?, ?, ?, ?, 'created')")
        ->execute([$res['id'], $auth['sub'], $planId, $billing, $coupon, $finalPrice]);

    // PayPal appends ?token=<id> to the return_url.
    $approvalUrl = '';
    foreach (($res['links'] ?? []) as $link) {
        if (($link['rel'] ?? '') === 'approve') {
            $approvalUrl = $link['href'] ?? '';
            break;
        }
    }

    success([
        'orderID' => $res['id'],
        'approvalUrl' => $approvalUrl,
        'plan_id' => $planId,
        'billing' => $billing,
        'amount' => $finalPrice,
    ]);
}

function capturePayPalOrder(): void
{
    $auth = requireAuth();
    $input = getJsonInput();
    $orderID = trim((string)($input['orderID'] ?? ''));
    if ($orderID === '') error('Order ID required');

    $db = getDB();
    expireOverdueSubscriptions($db, (int)$auth['sub']);

    // Recover plan/billing/coupon from the tracked order (or from explicit input).
    $orderStmt = $db->prepare("SELECT * FROM paypal_orders WHERE order_id = ?");
    $orderStmt->execute([$orderID]);
    $tracked = $orderStmt->fetch();
    if (!$tracked) error('Order not found. Please start the checkout again.', 404);
    if ((int)$tracked['user_id'] !== (int)$auth['sub']) {
        error('This order does not belong to your account', 403);
    }

    // Idempotency: an already-captured order must never create a second
    // subscription or payment row.
    if ($tracked['status'] === 'captured') {
        $dupStmt = $db->prepare("SELECT id FROM payments WHERE paypal_capture_id = ? LIMIT 1");
        $dupStmt->execute([$tracked['order_id']]);
        $dupId = $dupStmt->fetchColumn();
        $subStmt = $db->prepare("SELECT id, plan_id, billing, ends_at, status FROM user_subscriptions WHERE user_id = ? AND paypal_order_id = ? ORDER BY starts_at DESC LIMIT 1");
        $subStmt->execute([$auth['sub'], $tracked['order_id']]);
        $existingSub = $subStmt->fetch();
        if ($existingSub) {
            success([
                'subscription_id' => (int)$existingSub['id'],
                'alreadyCaptured' => true,
            ], 'Payment already completed');
        }
        if ($dupId) {
            success(['payment_id' => (int)$dupId, 'alreadyCaptured' => true], 'Payment already completed');
        }
        error('This order was already processed. If you were charged, contact support.', 409);
    }

    $planId = (int)$tracked['plan_id'];
    $billing = $tracked['billing'];
    $coupon = $tracked['coupon'];

    $planStmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $planStmt->execute([$planId]);
    $plan = $planStmt->fetch();
    if (!$plan) error('Plan not found');

    $res = paypalApi('POST', "/v2/checkout/orders/$orderID/capture");

    if (($res['_http_code'] ?? 0) !== 201 || ($res['status'] ?? '') !== 'COMPLETED') {
        error('We could not complete the payment. No charge was made. Please try again.', 502);
    }

    $capture = $res['purchase_units'][0]['payments']['captures'][0] ?? [];
    $captureId = (string)($capture['id'] ?? '');
    $paypalAmount = (float)($capture['amount']['value'] ?? 0);

    // Amount mismatch guard: never activate a plan for a different amount.
    if (abs($paypalAmount - (float)$tracked['amount']) > 0.02) {
        error('Payment amount mismatch detected. Contact support before using your plan.', 409);
    }

    // Dedupe by capture id (protects against double-capture retries).
    $dupPay = $db->prepare("SELECT id FROM payments WHERE paypal_capture_id = ? LIMIT 1");
    $dupPay->execute([$captureId]);
    if ($dupPay->fetchColumn()) {
        error('This payment was already recorded. Contact support if you see duplicates.', 409);
    }

    $interval = $billing === 'yearly' ? 'YEAR' : 'MONTH';

    $db->beginTransaction();
    try {
        $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status IN ('active', 'pending_cancel', 'payment_failed', 'suspended')")
            ->execute([$auth['sub']]);

        $stmt = $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at, paypal_order_id)
            VALUES (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval), ?)");
        $stmt->execute([$auth['sub'], $planId, $billing, $tracked['order_id']]);
        $subId = (int)$db->lastInsertId();

        $stmt = $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, method, paypal_capture_id, type, status)
            VALUES (?, ?, ?, 'paypal', ?, 'subscription', 'completed')");
        $stmt->execute([$auth['sub'], $subId, $paypalAmount, $captureId]);

        $db->prepare("UPDATE paypal_orders SET status = 'captured' WHERE order_id = ?")
            ->execute([$orderID]);

        if ($coupon) {
            $db->prepare("UPDATE coupons SET current_uses = current_uses + 1 WHERE code = ? AND is_active = 1")
                ->execute([$coupon]);
        }

        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        error_log('capturePayPalOrder failed: ' . $e->getMessage());
        error('We could not save your payment. Contact support — your PayPal payment may have gone through.', 500);
    }

    // Welcome notification (in-app + push).
    require_once __DIR__ . '/../../helpers/notify.php';
    notifyUser($db, (int)$auth['sub'], 'subscription', 'Payment received', 'Your PayPal payment of $' . number_format($paypalAmount, 2) . ' was successful. Your ' . $plan['name'] . ' plan is active!', 'CreditCard', '/client/dashboard', ['email' => true]);

    success([
        'subscription_id' => $subId,
        'capture_id' => $captureId,
    ], 'Payment completed', 201);
}

function handlePayPalWebhook(): void
{
    $payload = @file_get_contents('php://input');
    $headers = getallheaders();
    $signature = $headers['Paypal-Transmission-Sig'] ?? '';
    $transmissionId = $headers['Paypal-Transmission-Id'] ?? '';
    $timestamp = $headers['Paypal-Transmission-Time'] ?? '';
    $certUrl = $headers['Paypal-Cert-Url'] ?? '';
    $authAlgo = $headers['Paypal-Auth-Algo'] ?? '';

    $webhookId = defined('PAYPAL_WEBHOOK_ID') ? PAYPAL_WEBHOOK_ID : '';
    if ($webhookId === '') {
        http_response_code(400);
        exit;
    }

    $verificationData = [
        'auth_algo' => $authAlgo,
        'cert_url' => $certUrl,
        'transmission_id' => $transmissionId,
        'transmission_sig' => $signature,
        'transmission_time' => $timestamp,
        'webhook_id' => $webhookId,
        'webhook_event' => json_decode($payload, true),
    ];

    $token = getPayPalAccessToken();
    $baseUrl = defined('PAYPAL_API_BASE') ? PAYPAL_API_BASE : 'https://api-m.sandbox.paypal.com';

    $ch = curl_init("$baseUrl/v1/notifications/verify-webhook-signature");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($verificationData),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer $token",
        ],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $verifyRes = curl_exec($ch);
    curl_close($ch);
    $verifyData = json_decode($verifyRes, true);

    if (($verifyData['verification_status'] ?? '') !== 'SUCCESS') {
        http_response_code(400);
        exit;
    }

    $event = json_decode($payload, true);
    $eventType = $event['event_type'] ?? '';
    $db = getDB();

    // Idempotency ledger (same mechanism as Stripe).
    try {
        $db->prepare("INSERT INTO webhook_events (event_id, source) VALUES (?, 'paypal')")
            ->execute([(string)($event['id'] ?? uniqid('pp_', true))]);
    } catch (\PDOException $e) {
        http_response_code(200);
        exit;
    }

    $resource = $event['resource'] ?? [];
    $captureId = (string)($resource['id'] ?? '');

    if ($eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        // The capture endpoint already records completed payments; the
        // webhook is a safety net for captures initiated outside the app.
        if ($captureId !== '') {
            $dupPay = $db->prepare("SELECT id FROM payments WHERE paypal_capture_id = ? LIMIT 1");
            $dupPay->execute([$captureId]);
            if (!$dupPay->fetchColumn()) {
                $customId = (string)($resource['custom_id'] ?? '');
                $userId = 0;
                if (preg_match('/^fp_u(\d+)_p(\d+)_(monthly|yearly)$/', $customId, $m)) {
                    $userId = (int)$m[1];
                    $planId = (int)$m[2];
                    $billing = $m[3];
                    $interval = $billing === 'yearly' ? 'YEAR' : 'MONTH';
                    $amount = (float)($resource['amount']['value'] ?? 0);

                    $db->beginTransaction();
                    try {
                        $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status IN ('active', 'pending_cancel', 'payment_failed', 'suspended')")
                            ->execute([$userId]);
                        $stmt = $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at, paypal_order_id)
                            VALUES (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval), ?)");
                        $stmt->execute([$userId, $planId, $billing, (string)($resource['supplementary_data']['related_ids']['order_id'] ?? null)]);
                        $subId = (int)$db->lastInsertId();
                        $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, method, paypal_capture_id, type, status)
                            VALUES (?, ?, ?, 'paypal', ?, 'subscription', 'completed')")
                            ->execute([$userId, $subId, $amount, $captureId]);
                        $db->commit();
                    } catch (\Throwable $e) {
                        $db->rollBack();
                        error_log('paypal webhook completion failed: ' . $e->getMessage());
                    }
                }
            }
        }
    } elseif (in_array($eventType, ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'], true)) {
        // Mark the original payment as refunded so admins see the real state.
        if ($captureId !== '') {
            $db->prepare("UPDATE payments SET status = 'refunded' WHERE paypal_capture_id = ? AND status = 'completed'")
                ->execute([$captureId]);
        }
    }

    http_response_code(200);
}

/**
 * Admin refund: works for PayPal captures; Stripe refunds need the payment
 * intent which is not stored yet, so they fail with an honest message.
 */
function adminRefundPayment(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT p.*, u.email FROM payments p JOIN users u ON u.id = p.user_id WHERE p.id = ?");
    $stmt->execute([(int)$id]);
    $payment = $stmt->fetch();
    if (!$payment) error('Payment not found', 404);

    if ($payment['status'] !== 'completed') {
        error('Only completed payments can be refunded', 409);
    }

    if ($payment['method'] === 'paypal' && !empty($payment['paypal_capture_id'])) {
        $res = paypalApi('POST', '/v2/payments/captures/' . $payment['paypal_capture_id'] . '/refund');
        $code = $res['_http_code'] ?? 0;
        if (!in_array($code, [200, 201], true)) {
            error('PayPal refund failed: ' . ($res['message'] ?? 'unknown error'), 502);
        }
        $db->prepare("UPDATE payments SET status = 'refunded' WHERE id = ?")->execute([(int)$id]);
        // The linked subscription is no longer paid.
        if ($payment['subscription_id']) {
            $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ? AND status IN ('active', 'pending_cancel')")
                ->execute([(int)$payment['subscription_id']]);
        }
        require_once __DIR__ . '/../../helpers/notify.php';
        notifyUser($db, (int)$payment['user_id'], 'subscription', 'Payment refunded', 'A payment of $' . number_format((float)$payment['amount'], 2) . ' was refunded by support.', 'CreditCard', '/client/dashboard', ['email' => true]);
        logAdminAction((int)$auth['sub'], 'refund_payment', 'payment', (int)$id, ['amount' => (float)$payment['amount'], 'method' => 'paypal']);
        success(null, 'Refund processed via PayPal');
        return;
    }

    error('Stripe refunds are not available yet (payment intent is not stored). Refund this payment from the Stripe dashboard.', 501);
}
