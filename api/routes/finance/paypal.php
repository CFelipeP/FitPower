<?php

function getPayPalAccessToken(): string
{
    $clientId = defined('PAYPAL_CLIENT_ID') ? PAYPAL_CLIENT_ID : '';
    $secret = defined('PAYPAL_CLIENT_SECRET') ? PAYPAL_CLIENT_SECRET : '';
    if (!$clientId || !$secret) {
        error('PayPal not configured', 500);
    }

    $baseUrl = defined('PAYPAL_API_BASE') ? PAYPAL_API_BASE : 'https://api-m.sandbox.paypal.com';
    $ch = curl_init("$baseUrl/v1/oauth2/token");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
        CURLOPT_USERPWD => "$clientId:$secret",
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_RETURNTRANSFER => true,
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

function createPayPalOrder(): void
{
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

    $coupon = $input['coupon_code'] ?? null;
    $discountPct = 0;
    $discountAmount = 0;

    if ($coupon) {
        $cStmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())");
        $cStmt->execute([$coupon]);
        $couponRow = $cStmt->fetch();
        if ($couponRow) {
            if ((int)$couponRow['max_uses'] > 0 && (int)$couponRow['current_uses'] >= (int)$couponRow['max_uses']) {
                error('Coupon expired', 400);
            }
            if ($couponRow['plan_id'] && (int)$couponRow['plan_id'] !== (int)$planId) {
                error('Coupon not valid for this plan', 400);
            }
            $discountPct = (float)$couponRow['discount_pct'];
            $discountAmount = (float)$couponRow['discount_amount'];
        }
    }

    $finalPrice = $price;
    if ($discountPct > 0) {
        $finalPrice = $finalPrice * (1 - $discountPct / 100);
    }
    if ($discountAmount > 0) {
        $finalPrice = max(0, $finalPrice - $discountAmount);
    }
    $finalPrice = round($finalPrice, 2);

    $planLabel = $plan['name'] . ' (' . ($billing === 'yearly' ? 'Yearly' : 'Monthly') . ')';

    $orderData = [
        'intent' => 'CAPTURE',
        'purchase_units' => [[
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
        ],
    ];

    $res = paypalApi('POST', '/v2/checkout/orders', $orderData);

    if (($res['_http_code'] ?? 0) !== 201 || empty($res['id'])) {
        error('PayPal order creation failed: ' . ($res['message'] ?? ($res['_raw'] ?? 'unknown')), 500);
    }

    success([
        'orderID' => $res['id'],
        'plan_id' => $planId,
        'billing' => $billing,
        'amount' => $finalPrice,
    ]);
}

function capturePayPalOrder(): void
{
    $auth = requireAuth();
    $input = getJsonInput();
    $orderID = $input['orderID'] ?? '';
    $planId = $input['plan_id'] ?? null;
    $billing = $input['billing'] ?? 'monthly';
    $coupon = $input['coupon_code'] ?? null;

    if (!$orderID || !$planId) error('Order ID and plan ID required');

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found');

    $res = paypalApi('POST', "/v2/checkout/orders/$orderID/capture");

    if (($res['_http_code'] ?? 0) !== 201 || ($res['status'] ?? '') !== 'COMPLETED') {
        error('Payment capture failed: ' . ($res['message'] ?? ($res['_raw'] ?? 'unknown')), 500);
    }

    $capture = $res['purchase_units'][0]['payments']['captures'][0] ?? [];
    $paypalAmount = (float)($capture['amount']['value'] ?? 0);

    $interval = $billing === 'yearly' ? 'YEAR' : 'MONTH';

    $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status = 'active'")
        ->execute([$auth['sub']]);

    $paypalSubId = $res['id'];

    $stmt = $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at)
        VALUES (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval))");
    $stmt->execute([$auth['sub'], $planId, $billing]);
    $subId = (int)$db->lastInsertId();

    $stmt = $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, method, type, status)
        VALUES (?, ?, ?, 'paypal', 'subscription', 'completed')");
    $stmt->execute([$auth['sub'], $subId, $paypalAmount]);

    if ($coupon) {
        $cStmt = $db->prepare("UPDATE coupons SET current_uses = current_uses + 1 WHERE code = ? AND is_active = 1");
        $cStmt->execute([$coupon]);
    }

    success(['subscription_id' => $subId], 'Payment completed', 201);
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

    if ($eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        $resource = $event['resource'] ?? [];
        $customId = $resource['custom_id'] ?? '';
        if ($customId && str_starts_with($customId, 'user_')) {
            $userId = (int)substr($customId, 5);
            $db->prepare("INSERT INTO payments (user_id, amount, method, type, status)
                VALUES (?, ?, 'paypal', 'subscription', 'completed')")
                ->execute([$userId, (float)($resource['amount']['value'] ?? 0)]);
        }
    }

    http_response_code(200);
}
