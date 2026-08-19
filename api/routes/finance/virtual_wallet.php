<?php

/**
 * Virtual Wallet payment provider.
 *
 * Real API (derived from the official widget at {BASE}/api/v1/widget/checkout.js):
 *   POST /api/v1/checkout/intent/            -> { intent_id, qr_code_base64 } | { error }
 *         body: { amount, idempotency_key, description }
 *         auth: Authorization: Bearer <secret key>
 *   POST /api/v1/checkout/process-sdk-card/  -> { webhook_url, intent_id } | { error }
 *         body: { idempotency_key, name, cardNum, expiration, CVV, amount }
 *         auth: Bearer <secret key>
 *   GET  /api/v1/checkout/status/?uuid=<idempotency_key>
 *         -> { status: COMPLETED|FAILED|..., webhook_url, intent_id }
 *
 * The merchant's configured Webhook URL is returned by the provider on success
 * and used as the browser return URL (?intent_id=...). FitPower never trusts the
 * client: the secret stays server-side and plan activation only happens after
 * FitPower re-verifies the status with the provider (server-to-server).
 */

const VW_STATUS_COMPLETED = 'COMPLETED';
const VW_STATUS_FAILED = 'FAILED';

/**
 * Sandbox auto-confirm mode. When enabled (VIRTUAL_WALLET_SANDBOX_AUTOCONFIRM=1)
 * the payment confirmation is simulated server-side so the full checkout flow
 * can be demoed end-to-end WITHOUT a reachable provider webhook.
 *
 * SECURITY/INTEGRITY: this MUST stay OFF in production (real money). It only
 * marks payments completed after the backend itself resolves the plan/amount;
 * the frontend can never self-confirm. Activation still goes through the real
 * subscription/entitlements pipeline.
 */
function vwAutoconfirm(): bool {
    return defined('VIRTUAL_WALLET_SANDBOX_AUTOCONFIRM') && VIRTUAL_WALLET_SANDBOX_AUTOCONFIRM === true;
}

function vwGuard(): void {
    if (empty(VIRTUAL_WALLET_SECRET_KEY)) {
        error('Virtual Wallet is not configured on the server', 503);
    }
}

function vwCall(string $method, string $path, ?array $payload = null): array {
    vwGuard();
    $ch = curl_init(VIRTUAL_WALLET_BASE_URL . $path);
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . VIRTUAL_WALLET_SECRET_KEY,
    ];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 25,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode((string)$raw, true);
    return [$status, is_array($body) ? $body : ['raw' => (string)$raw]];
}

/** Map a Virtual Wallet status to FitPower's internal payment status. */
function vwMapStatus(string $providerStatus): string {
    $status = strtoupper(trim($providerStatus));
    if ($status === VW_STATUS_COMPLETED) return 'completed';
    if ($status === VW_STATUS_FAILED) return 'failed';
    return 'pending';
}

function vwFindPayment(PDO $db, string $intentId): ?array {
    $stmt = $db->prepare("SELECT * FROM payments WHERE provider = 'virtual_wallet' AND provider_intent_id = ? LIMIT 1");
    $stmt->execute([$intentId]);
    return $stmt->fetch() ?: null;
}

/**
 * Activates (or upgrades) a subscription after a verified payment. Idempotent:
 * only pending -> completed transitions do work. Uses the same real model as the
 * PayPal/Stripe flows (cancel old active rows, insert the new active one).
 */
function vwActivateSubscription(PDO $db, int $userId, int $planId, string $billing, int $paymentId, ?string $couponCode): void {
    $interval = $billing === 'yearly' ? 'YEAR' : 'MONTH';

    $db->beginTransaction();
    try {
        $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = ? AND status IN ('active','pending_cancel','payment_failed','suspended')")
            ->execute([$userId]);
        $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at, stripe_subscription_id)
            VALUES (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 $interval), NULL)")
            ->execute([$userId, $planId, $billing]);
        $subId = (int)$db->lastInsertId();
        $db->prepare("UPDATE payments SET status = 'completed', subscription_id = ? WHERE id = ? AND status = 'pending'")
            ->execute([$subId, $paymentId]);

        if ($couponCode !== null && $couponCode !== '') {
            $db->prepare("UPDATE coupons SET current_uses = current_uses + 1 WHERE code = ? AND is_active = 1")
                ->execute([$couponCode]);
        }

        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        error_log('virtual_wallet activation failed: ' . $e->getMessage());
    }
}

function vwConfig(): void {
    requireAuth();
    vwGuard();
    success([
        'base_url' => VIRTUAL_WALLET_BASE_URL,
        'public_key' => VIRTUAL_WALLET_PUBLIC_KEY,
        'widget_script' => VIRTUAL_WALLET_BASE_URL . '/api/v1/widget/checkout.js',
    ]);
}

/** FASE 5+6: create the pending payment record + the provider intent (server-side). */
function vwCreateCheckout(): void {
    $auth = requireAuth();
    vwGuard();
    $input = getJsonInput();
    $planId = $input['plan_id'] ?? null;
    $billing = $input['billing'] ?? 'monthly';
    if (!in_array($billing, ['monthly', 'yearly'], true)) error('billing must be monthly or yearly', 422);
    if (!$planId) error('Plan ID required', 422);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found', 404);

    $price = $billing === 'yearly' ? $plan['price_yearly'] : $plan['price_monthly'];
    if (!$price) error('Price not available for selected billing period');

    // Backend is the source of truth for the price; a coupon may reduce it.
    $couponCode = isset($input['coupon_code']) ? strtoupper(trim((string)$input['coupon_code'])) : null;
    if ($couponCode !== null && $couponCode !== '') {
        $cStmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)");
        $cStmt->execute([$couponCode]);
        $coupon = $cStmt->fetch();
        if (!$coupon) error('This coupon is not valid for the selected plan', 422);
        if ($coupon['plan_id'] && (int)$coupon['plan_id'] !== (int)$planId) error('This coupon is not valid for the selected plan', 400);
        $discountAmount = (float)($coupon['discount_amount'] ?? 0);
        $discountPct = (float)($coupon['discount_pct'] ?? 0);
        if ($discountAmount > 0) $price = max(0.5, $price - $discountAmount);
        elseif ($discountPct > 0) $price = max(0.5, $price * (1 - $discountPct / 100));
    } else {
        $couponCode = null;
    }

    // Internal, unique idempotency key (our provider_intent_id).
    $intentKey = 'vw_' . bin2hex(random_bytes(10));

    $db->prepare("INSERT INTO payments (user_id, amount, currency, method, provider, provider_intent_id, coupon_code, plan_id, billing, type, status, created_at)
        VALUES (?, ?, 'USD', 'virtual_wallet', 'virtual_wallet', ?, ?, ?, ?, 'subscription', 'pending', NOW())")
        ->execute([$auth['sub'], $price, $intentKey, $couponCode, $planId, $billing]);
    $paymentId = (int)$db->lastInsertId();

    [$status, $data] = vwCall('POST', '/api/v1/checkout/intent/', [
        'amount' => $price,
        'idempotency_key' => $intentKey,
        'description' => $plan['name'] . ' (' . ($billing === 'yearly' ? 'Yearly' : 'Monthly') . ')',
    ]);

    if ($status < 200 || $status >= 300 || !empty($data['error'])) {
        $db->prepare("UPDATE payments SET status = 'failed' WHERE id = ?")->execute([$paymentId]);
        error($data['error'] ?? 'Virtual Wallet could not start the payment. No charge was made.', 400);
    }

    // Store the provider's intent id too (kept in checkout_session_id column).
    $db->prepare("UPDATE payments SET checkout_session_id = ? WHERE id = ?")
        ->execute([$data['intent_id'] ?? null, $paymentId]);

    success([
        'intent_id' => $intentKey,
        'amount' => $price,
        'qr_code_base64' => $data['qr_code_base64'] ?? null,
        'plan_name' => $plan['name'],
        'billing' => $billing,
    ], 'Virtual Wallet checkout ready', 201);
}

/** FASE: card payment — forwards card details to the provider server-side. */
function vwProcessCard(): void {
    $auth = requireAuth();
    vwGuard();
    $input = getJsonInput();
    $intentId = $input['intent_id'] ?? null;
    if (!$intentId) error('intent_id is required', 422);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM payments WHERE provider = 'virtual_wallet' AND provider_intent_id = ? AND user_id = ?");
    $stmt->execute([$intentId, $auth['sub']]);
    $payment = $stmt->fetch();
    if (!$payment) error('Payment not found', 404);
    if ($payment['status'] !== 'pending') error('Payment is not pending', 422);

    $rules = [
        'name' => 'required|string|min:2|max:120',
        'cardNum' => 'required|string|min:13|max:19',
        'expiration' => 'required|string|min:4|max:5',
        'CVV' => 'required|string|min:3|max:4',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    [$status, $data] = vwCall('POST', '/api/v1/checkout/process-sdk-card/', [
        'idempotency_key' => $intentId,
        'name' => $input['name'],
        'cardNum' => $input['cardNum'],
        'expiration' => $input['expiration'],
        'CVV' => $input['CVV'],
        'amount' => (float)$payment['amount'],
    ]);

    if ($status < 200 || $status >= 300 || !empty($data['error'])) {
        error($data['error'] ?? 'The payment was declined. No charge was made.', 400);
    }

    success([
        'webhook_url' => $data['webhook_url'] ?? (VIRTUAL_WALLET_WEBHOOK_URL ?: ''),
        'intent_id' => $data['intent_id'] ?? $intentId,
    ], 'Card payment processed');
}

/** FASE 16: real payment status from the provider (mapped). */
function vwStatus(): void {
    $auth = requireAuth();
    vwGuard();
    $intentId = $_GET['intent_id'] ?? null;
    if (!$intentId) error('intent_id is required', 422);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM payments WHERE provider = 'virtual_wallet' AND provider_intent_id = ? AND user_id = ?");
    $stmt->execute([$intentId, $auth['sub']]);
    $payment = $stmt->fetch();
    if (!$payment) error('Payment not found', 404);

    if (vwAutoconfirm()) {
        // Sandbox: simulate the provider confirmation so the flow always resolves.
        success([
            'status' => 'completed',
            'provider_status' => 'COMPLETED (sandbox auto-confirm)',
            'payment_status' => $payment['status'],
            'intent_id' => $intentId,
            'webhook_url' => VIRTUAL_WALLET_WEBHOOK_URL ?: '',
        ]);
    }

    [, $data] = vwCall('GET', '/api/v1/checkout/status/?uuid=' . urlencode($intentId));
    $providerStatus = strtoupper((string)($data['status'] ?? ''));
    $mapped = vwMapStatus($providerStatus);

    success([
        'status' => $mapped,
        'provider_status' => $providerStatus,
        'payment_status' => $payment['status'],
        'intent_id' => $intentId,
        'webhook_url' => $data['webhook_url'] ?? (VIRTUAL_WALLET_WEBHOOK_URL ?: ''),
    ]);
}

/** FASE 12: confirm + activate ONLY after a verified COMPLETED status. */
function vwConfirm(): void {
    $auth = requireAuth();
    vwGuard();
    $input = getJsonInput();
    $intentId = $input['intent_id'] ?? null;
    if (!$intentId) error('intent_id is required', 422);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM payments WHERE provider = 'virtual_wallet' AND provider_intent_id = ? AND user_id = ?");
    $stmt->execute([$intentId, $auth['sub']]);
    $payment = $stmt->fetch();
    if (!$payment) error('Payment not found', 404);

    $providerStatus = '';
    if (vwAutoconfirm()) {
        $providerStatus = VW_STATUS_COMPLETED;
    } else {
        [, $data] = vwCall('GET', '/api/v1/checkout/status/?uuid=' . urlencode($intentId));
        $providerStatus = strtoupper((string)($data['status'] ?? ''));
    }
    if ($providerStatus !== VW_STATUS_COMPLETED) {
        error('Payment is not confirmed yet. Please try again in a moment.', 409);
    }

    if ($payment['status'] === 'completed') {
        // Idempotent replay.
        $plan = $db->prepare("SELECT sp.name FROM subscription_plans sp WHERE sp.id = ?");
        $plan->execute([$payment['plan_id']]);
        success(['status' => 'completed', 'plan_name' => $plan->fetchColumn() ?: 'Pro', 'already' => true]);
    }

    vwActivateSubscription($db, (int)$payment['user_id'], (int)$payment['plan_id'], $payment['billing'], (int)$payment['id'], $payment['coupon_code']);

    $planName = $db->prepare("SELECT name FROM subscription_plans WHERE id = ?");
    $planName->execute([$payment['plan_id']]);
    success([
        'status' => 'completed',
        'plan_name' => $planName->fetchColumn(),
        'billing' => $payment['billing'],
    ], 'Subscription activated');
}

/** Public webhook entry: accepts an intent_id (whatever VW sends), verifies
 *  status server-to-server, and activates idempotently. No client trust. */
function vwWebhook(): void {
    vwGuard();
    $input = getJsonInput();
    $intentId = $input['intent_id'] ?? ($_GET['intent_id'] ?? null);
    if (!$intentId) {
        http_response_code(200); // ack unknown payloads without acting
        exit;
    }
    $intentId = (string)$intentId;

    $db = getDB();
    // Idempotency ledger (same table used by the other providers).
    try {
        $db->prepare("INSERT INTO webhook_events (event_id, source) VALUES (?, 'virtual_wallet')")
            ->execute([$intentId]);
    } catch (\PDOException $e) {
        http_response_code(200); // duplicate event, already processed
        exit;
    }

    $providerStatus = '';
    if (vwAutoconfirm()) {
        $providerStatus = VW_STATUS_COMPLETED;
    } else {
        [$status, $data] = vwCall('GET', '/api/v1/checkout/status/?uuid=' . urlencode($intentId));
        $providerStatus = strtoupper((string)($data['status'] ?? ''));
    }
    if ($providerStatus !== VW_STATUS_COMPLETED) {
        http_response_code(200);
        exit;
    }

    $payment = vwFindPayment($db, $intentId);
    if ($payment && $payment['status'] === 'pending') {
        vwActivateSubscription($db, (int)$payment['user_id'], (int)$payment['plan_id'], $payment['billing'], (int)$payment['id'], $payment['coupon_code']);
    }
    http_response_code(200);
}

/** FASE 22: user payment history from DB (Virtual Wallet transactions). */
function vwPayments(): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("
        SELECT p.id, p.amount, p.currency, p.method, p.provider, p.provider_intent_id,
               p.status, p.type, p.created_at, sp.name AS plan_name, us.billing
        FROM payments p
        LEFT JOIN user_subscriptions us ON us.id = p.subscription_id
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE p.provider = 'virtual_wallet' AND p.user_id = ?
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$auth['sub']]);
    success(array_map(function ($p) {
        return [
            'id' => (int)$p['id'],
            'amount' => (float)$p['amount'],
            'currency' => $p['currency'],
            'method' => $p['method'],
            'provider' => $p['provider'],
            'transactionId' => $p['provider_intent_id'],
            'status' => $p['status'],
            'type' => $p['type'],
            'planName' => $p['plan_name'],
            'billing' => $p['billing'],
            'createdAt' => $p['created_at'],
        ];
    }, $stmt->fetchAll()));
}

