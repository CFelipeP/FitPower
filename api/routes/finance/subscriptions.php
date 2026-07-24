<?php

require_once __DIR__ . '/../../vendor/autoload.php';

function listPlans(): void {
    $db = getDB();

    $stmt = $db->query("
        SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY price_monthly
    ");
    $plans = $stmt->fetchAll();

    if (empty($plans)) {
        success([]);
        return;
    }

    $planIds = array_column($plans, 'id');
    $placeholders = implode(',', array_fill(0, count($planIds), '?'));
    $featStmt = $db->prepare("SELECT plan_id, text, included FROM plan_features WHERE plan_id IN ($placeholders) ORDER BY plan_id, sort_order");
    $featStmt->execute(array_map('intval', $planIds));
    $allFeatures = $featStmt->fetchAll();

    $featuresByPlan = [];
    foreach ($allFeatures as $f) {
        $featuresByPlan[(int)$f['plan_id']][] = $f;
    }

    $result = array_map(function($p) use ($featuresByPlan) {
        $features = $featuresByPlan[(int)$p['id']] ?? [];

        return [
            'id' => (int)$p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'popular' => (bool)$p['popular'],
            'price_monthly' => (float)$p['price_monthly'],
            'price_yearly' => (float)$p['price_yearly'],
            'price' => [
                'monthly' => '$' . number_format($p['price_monthly'], 0),
                'yearly' => '$' . number_format($p['price_yearly'], 0),
            ],
            'features' => array_map(function($f) {
                return ['text' => $f['text'], 'name' => $f['text'], 'included' => (bool)$f['included'], 'inc' => (bool)$f['included']];
            }, $features),
        ];
    }, $plans);

    success($result);
}

function getUserSubscription(): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        SELECT us.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.starts_at DESC LIMIT 1
    ");
    $stmt->execute([$auth['sub']]);
    $sub = $stmt->fetch();

    if (!$sub) {
        success(null, 'Sin suscripción activa');
        return;
    }

    success([
        'id' => (int)$sub['id'],
        'planId' => (int)$sub['plan_id'],
        'planName' => $sub['plan_name'],
        'billing' => $sub['billing'],
        'price' => $sub['billing'] === 'yearly' ? $sub['price_yearly'] : $sub['price_monthly'],
        'status' => $sub['status'],
        'startedAt' => $sub['starts_at'],
        'endsAt' => $sub['ends_at'],
    ]);
}

function cancelUserSubscription(): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_subscriptions WHERE user_id = ? AND status = 'active' ORDER BY starts_at DESC LIMIT 1");
    $stmt->execute([$auth['sub']]);
    $subscription = $stmt->fetch();

    if (!$subscription) error('No active subscription found');

    $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?")
        ->execute([$subscription['id']]);

    success(null, 'Subscription cancelled');
}
// --- Admin Subscription Management ---

function adminListSubscriptions(): void {
    requireRole('admin');
    $db = getDB();

    $status = $_GET['status'] ?? '';
    if ($status && !in_array($status, ['active', 'cancelled', 'expired'])) {
        error('Filtro de estado inválido', 400);
    }

    $where = [];
    $params = [];

    if ($status) {
        $where[] = "us.status = ?";
        $params[] = $status;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT us.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly,
               CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email as user_email
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        JOIN users u ON u.id = us.user_id
        $whereClause
        ORDER BY us.starts_at DESC
    ");
    $stmt->execute($params);
    $subscriptions = $stmt->fetchAll();

    $result = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'userId' => (int)$s['user_id'],
            'userName' => $s['user_name'],
            'userEmail' => $s['user_email'],
            'planName' => $s['plan_name'],
            'billing' => $s['billing'],
            'price' => $s['billing'] === 'yearly' ? (float)$s['price_yearly'] : (float)$s['price_monthly'],
            'status' => $s['status'],
            'startedAt' => $s['starts_at'],
            'endsAt' => $s['ends_at'],
        ];
    }, $subscriptions);

    success($result);
}

function adminGetSubscriptionMetrics(): void {
    requireRole('admin');
    $db = getDB();

    $mrr = (float)$db->query("
        SELECT COALESCE(SUM(
            CASE WHEN us.billing = 'yearly' THEN sp.price_yearly / 12 ELSE sp.price_monthly END
        ), 0)
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
    ")->fetchColumn();

    $totalActive = (int)$db->query("SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active'")->fetchColumn();
    $totalCancelled = (int)$db->query("SELECT COUNT(*) FROM user_subscriptions WHERE status = 'cancelled'")->fetchColumn();
    $totalSubs = $totalActive + $totalCancelled;
    $churnRate = $totalSubs > 0 ? round($totalCancelled / $totalSubs * 100, 1) : 0;

    $planStmt = $db->query("
        SELECT sp.name, COUNT(*) as count,
               COALESCE(SUM(
                   CASE WHEN us.billing = 'yearly' THEN sp.price_yearly / 12 ELSE sp.price_monthly END
               ), 0) as revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
        GROUP BY sp.id, sp.name
        ORDER BY count DESC
    ");
    $plans = $planStmt->fetchAll();

    $planBreakdown = array_map(function($p) {
        return [
            'name' => $p['name'],
            'count' => (int)$p['count'],
            'revenue' => (float)$p['revenue'],
        ];
    }, $plans);

    success([
        'mrr' => $mrr,
        'activeSubscriptions' => $totalActive,
        'cancelledSubscriptions' => $totalCancelled,
        'churnRate' => $churnRate,
        'planBreakdown' => $planBreakdown,
    ]);
}

function adminCancelSubscription(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM user_subscriptions WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Suscripción no encontrada', 404);
    }

    $db->prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?")
        ->execute([$id]);

    $subStmt = $db->prepare("SELECT user_id FROM user_subscriptions WHERE id = ?");
    $subStmt->execute([$id]);
    $userId = $subStmt->fetchColumn();
    $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) VALUES (?, 'subscription', 'Suscripción cancelada', ?, 'CreditCard', '/client/dashboard', NOW())")->execute([$userId, 'Tu suscripción ha sido cancelada por el administrador.']);

    logAdminAction($auth['sub'], 'cancel_subscription', 'subscription', (int)$id, null);

    success(null, 'Suscripción cancelada');
}

function adminChangeSubscriptionPlan(string $id): void {
    requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    $rules = ['planId' => 'required'];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $stmt = $db->prepare("SELECT id FROM user_subscriptions WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Suscripción no encontrada', 404);
    }

    $stmt = $db->prepare("SELECT id FROM subscription_plans WHERE id = ?");
    $stmt->execute([$input['planId']]);
    if (!$stmt->fetch()) {
        error('Plan no encontrado', 404);
    }

    $db->prepare("UPDATE user_subscriptions SET plan_id = ? WHERE id = ?")
        ->execute([$input['planId'], $id]);

    success(null, 'Plan de suscripción actualizado');
}

function adminListPlans(): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->query("SELECT * FROM subscription_plans ORDER BY price_monthly");
    $plans = $stmt->fetchAll();

    if (empty($plans)) {
        success([]);
        return;
    }

    $planIds = array_column($plans, 'id');
    $placeholders = implode(',', array_fill(0, count($planIds), '?'));
    $featStmt = $db->prepare("SELECT plan_id, text, included FROM plan_features WHERE plan_id IN ($placeholders) ORDER BY plan_id, sort_order");
    $featStmt->execute(array_map('intval', $planIds));
    $allFeatures = $featStmt->fetchAll();

    $featuresByPlan = [];
    foreach ($allFeatures as $f) {
        $featuresByPlan[(int)$f['plan_id']][] = $f;
    }

    $result = array_map(function($p) use ($featuresByPlan) {
        $features = $featuresByPlan[(int)$p['id']] ?? [];

        return [
            'id' => (int)$p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'popular' => (bool)$p['popular'],
            'priceMonthly' => (float)$p['price_monthly'],
            'priceYearly' => (float)$p['price_yearly'],
            'status' => $p['status'],
            'features' => array_map(function($f) {
                return ['text' => $f['text'], 'included' => (bool)$f['included']];
            }, $features),
        ];
    }, $plans);

    success($result);
}

function adminSavePlan(): void {
    requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    $rules = [
        'name' => 'required|string|min:1|max:255',
        'priceMonthly' => 'required|numeric|min_value:0',
        'priceYearly' => 'required|numeric|min_value:0',
    ];
    $extraRules = [];
    if (isset($input['id'])) $extraRules['id'] = 'numeric';
    if (isset($input['status'])) $extraRules['status'] = 'in:active,inactive';
    if (isset($input['description'])) $extraRules['description'] = 'string|max:1000';
    if (isset($input['popular'])) $extraRules['popular'] = 'boolean';

    $allRules = array_merge($rules, $extraRules);
    $errors = validate($input, $allRules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $status = $input['status'] ?? 'active';
    if (!in_array($status, ['active', 'inactive'], true)) {
        $status = 'active';
    }

    if (!empty($input['id'])) {
        $stmt = $db->prepare("SELECT id FROM subscription_plans WHERE id = ?");
        $stmt->execute([$input['id']]);
        if (!$stmt->fetch()) {
            error('Plan no encontrado', 404);
        }

        $stmt = $db->prepare("UPDATE subscription_plans SET name = ?, description = ?, price_monthly = ?, price_yearly = ?, popular = ?, status = ? WHERE id = ?");
        $stmt->execute([
            $input['name'],
            $input['description'] ?? null,
            $input['priceMonthly'],
            $input['priceYearly'],
            !empty($input['popular']) ? 1 : 0,
            $status,
            $input['id'],
        ]);
        success(null, 'Plan actualizado');
    } else {
        $stmt = $db->prepare("INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, popular, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['name'],
            $input['description'] ?? null,
            $input['priceMonthly'],
            $input['priceYearly'],
            !empty($input['popular']) ? 1 : 0,
            $status,
        ]);
        success(['id' => (int)$db->lastInsertId()], 'Plan creado', 201);
    }
}

function createSubscription(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'planId' => 'required',
        'billing' => 'required|in:monthly,yearly',
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

    $couponCode = $input['couponCode'] ?? null;
    $discountPct = 0;
    if ($couponCode) {
        $couponStmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)");
        $couponStmt->execute([strtoupper($couponCode)]);
        $coupon = $couponStmt->fetch();
        if ($coupon) {
            $discountPct = (float)($coupon['discount_pct'] ?? 0);
            $db->prepare("UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?")->execute([$coupon['id']]);
        }
    }

    $discountedPrice = $price;
    if ($discountPct > 0) {
        $discountedPrice = $price * (1 - $discountPct / 100);
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
                        'name' => $plan['name'] . ' (' . ($input['billing'] === 'yearly' ? 'Yearly' : 'Monthly') . ')',
                        'description' => $plan['description'] ?? '',
                    ],
                    'unit_amount' => round($discountedPrice * 100),
                    'recurring' => ['interval' => $input['billing'] === 'yearly' ? 'year' : 'month'],
                ],
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => APP_URL . '/payment/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => APP_URL . '/payment/cancel',
            'metadata' => [
                'user_id' => $auth['sub'],
                'plan_id' => $input['planId'],
                'billing' => $input['billing'],
                'coupon_code' => $couponCode ?? '',
            ],
        ]);

        success(['url' => $session->url, 'session_id' => $session->id]);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}
