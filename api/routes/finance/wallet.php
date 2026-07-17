<?php

function createWalletSubscription(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'planId' => 'required',
        'billing' => 'required|in:monthly,yearly',
        'transactionId' => 'required|string',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
    $stmt->execute([$input['planId']]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found');

    $price = $input['billing'] === 'yearly' ? $plan['price_yearly'] : $plan['price_monthly'];
    if (!$price) error('Price not available for selected billing period');

    $startDate = date('Y-m-d H:i:s');
    $endDate = date('Y-m-d H:i:s', strtotime($input['billing'] === 'yearly' ? '+1 year' : '+1 month'));

    $db->beginTransaction();
    try {
        $existingStmt = $db->prepare("SELECT id FROM user_subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1");
        $existingStmt->execute([$auth['sub']]);
        $existing = $existingStmt->fetch();

        if ($existing) {
            $db->prepare("UPDATE user_subscriptions SET plan_id = ?, billing = ?, ends_at = ? WHERE id = ?")
                ->execute([$input['planId'], $input['billing'], $endDate, $existing['id']]);
            $subscriptionId = (int)$existing['id'];
        } else {
            $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at) VALUES (?, ?, ?, 'active', ?, ?)")
                ->execute([$auth['sub'], $input['planId'], $input['billing'], $startDate, $endDate]);
            $subscriptionId = (int)$db->lastInsertId();
        }

        $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, currency, method, type, status) VALUES (?, ?, ?, 'USD', 'wallet', 'subscription', 'completed')")
            ->execute([$auth['sub'], $subscriptionId, $price]);

        $db->commit();

        success([
            'subscriptionId' => $subscriptionId,
            'planName' => $plan['name'],
            'billing' => $input['billing'],
            'startsAt' => $startDate,
            'endsAt' => $endDate,
        ], 'Suscripción activada');

    } catch (Exception $e) {
        $db->rollBack();
        error('Error al crear suscripción: ' . $e->getMessage(), 500);
    }
}

function handleWalletWebhook(): void {
    $input = getJsonInput();

    if (empty($input['event']) || empty($input['transaction_id']) || empty($input['client_id'])) {
        error('Invalid webhook payload', 400);
    }

    $expectedClientId = 'pk_sandbox_aCbf6n7uMkdfH2Ej';
    if ($input['client_id'] !== $expectedClientId) {
        error('Invalid client', 403);
    }

    $db = getDB();

    $existingStmt = $db->prepare("SELECT id FROM payments WHERE method = 'wallet' AND status = 'completed' AND id = (SELECT MAX(id) FROM payments WHERE method = 'wallet')");
    $existingStmt->execute();

    switch ($input['event']) {
        case 'payment.completed':
            $userId = $input['user_id'] ?? null;
            $planId = $input['plan_id'] ?? null;
            $billing = $input['billing'] ?? 'monthly';
            $amount = $input['amount'] ?? 0;

            if (!$userId || !$planId) {
                error('Missing user_id or plan_id', 400);
            }

            $planStmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
            $planStmt->execute([$planId]);
            $plan = $planStmt->fetch();
            if (!$plan) error('Plan not found', 404);

            $startDate = date('Y-m-d H:i:s');
            $endDate = date('Y-m-d H:i:s', strtotime($billing === 'yearly' ? '+1 year' : '+1 month'));

            $db->beginTransaction();
            try {
                $existingStmt = $db->prepare("SELECT id FROM user_subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1");
                $existingStmt->execute([$userId]);
                $existing = $existingStmt->fetch();

                if ($existing) {
                    $db->prepare("UPDATE user_subscriptions SET plan_id = ?, billing = ?, ends_at = ? WHERE id = ?")
                        ->execute([$planId, $billing, $endDate, $existing['id']]);
                    $subscriptionId = (int)$existing['id'];
                } else {
                    $db->prepare("INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at) VALUES (?, ?, ?, 'active', ?, ?)")
                        ->execute([$userId, $planId, $billing, $startDate, $endDate]);
                    $subscriptionId = (int)$db->lastInsertId();
                }

                $db->prepare("INSERT INTO payments (user_id, subscription_id, amount, currency, method, type, status) VALUES (?, ?, ?, 'USD', 'wallet', 'subscription', 'completed')")
                    ->execute([$userId, $subscriptionId, $amount]);

                $db->commit();
            } catch (Exception $e) {
                $db->rollBack();
                error('Webhook processing error: ' . $e->getMessage(), 500);
            }

            success(['status' => 'ok'], 'Payment processed');
            break;

        case 'payment.failed':
            error('Payment failed', 400);
            break;

        default:
            error('Unknown event: ' . $input['event'], 400);
    }
}
