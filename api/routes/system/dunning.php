<?php

/**
 * Dunning cron (internal endpoint). Runs the payment recovery timeline for
 * subscriptions whose payment failed:
 *
 *   D1  (webhook) — first notification ("we couldn't charge your card")
 *   D3  — reminder ("we will retry your card")
 *   D5  — warning ("your access is at risk")
 *   D7  — soft suspension (data preserved, reactivation screen shown)
 *
 * A successful invoice.paid event resets the stage and reactivates the plan.
 */
function runDunning(): void {
    $secret = INTERNAL_API_SECRET;
    if ($secret === '') {
        error('Cron not configured: define INTERNAL_API_SECRET', 503);
    }
    if (!hash_equals($secret, $_SERVER['HTTP_X_INTERNAL_SECRET'] ?? '')) {
        error('Access denied', 403);
    }

    $db = getDB();
    require_once __DIR__ . '/../../helpers/notify.php';

    $stmt = $db->query("
        SELECT id, user_id, last_payment_failed_at, dunning_stage
        FROM user_subscriptions
        WHERE status = 'payment_failed' AND last_payment_failed_at IS NOT NULL
    ");
    $handled = 0;

    foreach ($stmt->fetchAll() as $sub) {
        $failedAt = new DateTime($sub['last_payment_failed_at']);
        $days = (int)$failedAt->diff(new DateTime())->days;
        $stage = (int)$sub['dunning_stage'];

        if ($days >= 7) {
            if ($stage < 4) {
                $db->prepare("UPDATE user_subscriptions SET status = 'suspended', dunning_stage = 4 WHERE id = ?")
                    ->execute([(int)$sub['id']]);
                notifyUser(
                    $db,
                    (int)$sub['user_id'],
                    'subscription',
                    'Access suspended',
                    'Your subscription has been suspended because we could not process the payment. Update your payment method to restore access — your data is fully preserved.',
                    'CreditCard',
                    '/client/dashboard',
                    ['email' => true]
                );
                $handled++;
            }
        } elseif ($days >= 5 && $stage < 3) {
            $db->prepare("UPDATE user_subscriptions SET dunning_stage = 3 WHERE id = ?")
                ->execute([(int)$sub['id']]);
            notifyUser(
                $db,
                (int)$sub['user_id'],
                'subscription',
                'Your access is at risk',
                'We still could not process your payment. Your access will be suspended in 2 days unless the payment succeeds. Update your payment method now.',
                'CreditCard',
                '/client/dashboard',
                ['email' => true]
            );
            $handled++;
        } elseif ($days >= 3 && $stage < 2) {
            $db->prepare("UPDATE user_subscriptions SET dunning_stage = 2 WHERE id = ?")
                ->execute([(int)$sub['id']]);
            notifyUser(
                $db,
                (int)$sub['user_id'],
                'subscription',
                'Payment reminder',
                'We will retry your card soon. No action is needed if your payment method is up to date.',
                'CreditCard',
                '/client/dashboard',
                ['email' => true]
            );
            $handled++;
        }
    }

    success(['handled' => $handled]);
}
