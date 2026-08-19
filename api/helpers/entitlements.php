<?php
/**
 * Plan entitlements — facade over the single source of truth in
 * helpers/features.php. Kept as the public entry point used by
 * GET /entitlements and existing callers (can/assertEntitled).
 *
 * The response now carries the FULL feature matrix keyed by feature_key
 * (plus the legacy 3 keys for backward compatibility).
 */

require_once __DIR__ . '/features.php';

// A subscription whose payment failed must NOT keep paying-plan features.
// Stripe recovers 'payment_failed' subscriptions automatically, but until a
// charge actually succeeds the user is not entitled.
const PAYING_STATUSES = ['active', 'pending_cancel'];

function getActiveSubscription(PDO $db, int $userId): ?array {
    // Lazy expiry: one-time PayPal plans have no auto-renewal.
    require_once __DIR__ . '/../routes/finance/paypal.php';
    expireOverdueSubscriptions($db, $userId);

    $stmt = $db->prepare("
        SELECT us.*, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ?
        ORDER BY us.starts_at DESC, us.id DESC LIMIT 1
    ");
    $stmt->execute([$userId]);
    $sub = $stmt->fetch();
    return $sub ?: null;
}

/**
 * @return array Full feature matrix + plan context + legacy 3 keys.
 */
function getEntitlements(PDO $db, int $userId): array {
    $matrix = getUserFeatureMatrix($db, $userId);
    $ctx = getUserPlanContext($db, $userId);

    return array_merge($matrix, [
        // Legacy keys (backward compatible with existing frontend code).
        'live_coaching' => $matrix['live_coaching'],
        'nutrition_prescription' => $matrix['nutrition_prescription'],
        'one_on_one' => $matrix['one_on_one'],
        // Plan context.
        'planId' => $ctx['planId'],
        'planName' => $ctx['planName'],
        'billing' => $ctx['billing'],
        'status' => $ctx['status'],
        'endsAt' => $ctx['endsAt'],
        'trialEndsAt' => $ctx['trialEndsAt'],
        'hasPlan' => $ctx['hasPlan'],
        'isPaying' => $ctx['isPaying'],
    ]);
}

function can(PDO $db, int $userId, string $feature): bool {
    return hasFeature($db, $userId, $feature);
}

function assertEntitled(PDO $db, int $userId, string $feature, string $message): void {
    requireFeature($db, $userId, $feature);
}

function getEntitlementsEndpoint(): void {
    $auth = requireAuth();
    success(getEntitlements(getDB(), (int)$auth['sub']));
}
