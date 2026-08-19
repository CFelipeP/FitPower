<?php
/**
 * Feature catalog & entitlement matrix — the SINGLE source of truth for
 * what each paying plan unlocks. Enforced server-side via requireFeature().
 *
 * visibility: 'hidden' (never shown to users without the feature) or
 *             'locked'  (shown as locked with an upgrade prompt).
 */

const FEATURE_CATALOG = [
    'on_demand_workouts'       => ['label' => 'On-demand workouts',        'min_plan' => 'starter',    'visibility' => 'hidden'],
    'basic_progress'           => ['label' => 'Basic progress tracking',   'min_plan' => 'starter',    'visibility' => 'hidden'],
    'mobile_access'            => ['label' => 'Mobile app access',         'min_plan' => 'starter',    'visibility' => 'hidden'],
    'live_coaching'            => ['label' => 'Live coaching sessions',    'min_plan' => 'starter',    'visibility' => 'hidden'],
    'nutrition_prescription'   => ['label' => 'Nutrition prescription',    'min_plan' => 'starter',    'visibility' => 'hidden'],
    'unlimited_live_coaching'  => ['label' => 'Unlimited live coaching',   'min_plan' => 'pro',        'visibility' => 'locked'],
    'ai_programming'           => ['label' => 'AI-powered programming',    'min_plan' => 'pro',        'visibility' => 'locked'],
    'custom_nutrition'         => ['label' => 'Custom nutrition plans',    'min_plan' => 'pro',        'visibility' => 'locked'],
    'priority_support'         => ['label' => 'Priority support',          'min_plan' => 'pro',        'visibility' => 'locked'],
    'one_on_one'               => ['label' => '1-on-1 personal coaching',  'min_plan' => 'enterprise', 'visibility' => 'locked'],
    'premium_nutrition'        => ['label' => 'Premium nutrition',         'min_plan' => 'enterprise', 'visibility' => 'locked'],
    'body_composition'         => ['label' => 'Body composition analysis', 'min_plan' => 'enterprise', 'visibility' => 'locked'],
    'early_access'             => ['label' => 'Early access to features',  'min_plan' => 'enterprise', 'visibility' => 'hidden'],
];

/**
 * @return array{planId:?int, planName:?string, status:?string, billing:?string,
 *               endsAt:?string, trialEndsAt:?string, isPaying:bool, hasPlan:bool}
 */
function getUserPlanContext(PDO $db, int $userId): array {
    require_once __DIR__ . '/../routes/finance/paypal.php';
    expireOverdueSubscriptions($db, $userId);

    $stmt = $db->prepare("
        SELECT us.plan_id, us.billing, us.status, us.ends_at, us.trial_ends_at, sp.name AS plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ?
        ORDER BY us.starts_at DESC, us.id DESC LIMIT 1
    ");
    $stmt->execute([$userId]);
    $sub = $stmt->fetch();
    if (!$sub) {
        return ['planId' => null, 'planName' => null, 'status' => null, 'billing' => null,
                'endsAt' => null, 'trialEndsAt' => null, 'isPaying' => false, 'hasPlan' => false];
    }
    $isPaying = in_array($sub['status'], ['active', 'pending_cancel'], true);
    return [
        'planId' => (int)$sub['plan_id'],
        'planName' => $sub['plan_name'],
        'status' => $sub['status'],
        'billing' => $sub['billing'],
        'endsAt' => $sub['ends_at'],
        'trialEndsAt' => $sub['trial_ends_at'],
        'isPaying' => $isPaying,
        'hasPlan' => true,
    ];
}

/** Plan tier ranks: higher includes everything below it ("Everything in ..."). */
function planRank(?string $planName): int {
    $name = strtolower((string)$planName);
    if (str_contains($name, 'enterprise')) return 3;
    if (str_contains($name, 'pro')) return 2;
    if (str_contains($name, 'starter')) return 1;
    return 0;
}

/** Returns the full feature matrix (feature_key => bool) for a user. */
function getUserFeatureMatrix(PDO $db, int $userId): array {
    $ctx = getUserPlanContext($db, $userId);
    $matrix = [];
    foreach (array_keys(FEATURE_CATALOG) as $key) {
        $matrix[$key] = false;
    }
    if (!$ctx['isPaying'] || $ctx['planId'] === null) {
        return $matrix;
    }

    $featStmt = $db->prepare("SELECT text, included, feature_key FROM plan_features WHERE plan_id = ?");
    $featStmt->execute([$ctx['planId']]);
    $rows = $featStmt->fetchAll();

    // Explicit per-plan rows (by feature_key, or legacy text match) win.
    $explicit = [];
    foreach ($rows as $f) {
        if (!(bool)$f['included']) continue;
        $key = $f['feature_key'];
        if (!$key) {
            foreach (FEATURE_CATALOG as $cand => $meta) {
                if (stripos($f['text'], strtolower($meta['label'])) !== false
                    || stripos(strtolower($f['text']), str_replace('_', ' ', $cand)) !== false) {
                    $explicit[$cand] = true;
                }
            }
            continue;
        }
        if (isset($matrix[$key])) $explicit[$key] = true;
    }

    // Tier inheritance: a Pro/Enterprise plan includes Starter-tier features
    // ("Everything in Starter/Pro") even without explicit rows.
    $rank = planRank($ctx['planName']);
    foreach (FEATURE_CATALOG as $key => $meta) {
        $minRank = planRank($meta['min_plan']);
        $matrix[$key] = ($explicit[$key] ?? false) || ($minRank > 0 && $rank >= $minRank);
    }
    return $matrix;
}

function hasFeature(PDO $db, int $userId, string $feature): bool {
    $matrix = getUserFeatureMatrix($db, $userId);
    return (bool)($matrix[$feature] ?? false);
}

/**
 * Enforces a feature server-side. 403 with a structured, frontend-friendly
 * error when the user is not entitled.
 */
function requireFeature(PDO $db, int $userId, string $feature): void {
    if (hasFeature($db, $userId, $feature)) return;
    $meta = FEATURE_CATALOG[$feature] ?? null;
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'code' => 'FEATURE_NOT_AVAILABLE',
        'feature' => $feature,
        'required_plan' => $meta['min_plan'] ?? null,
        'message' => 'This feature requires the ' . ($meta['min_plan'] ?? '') . ' plan.',
    ]);
    exit;
}
