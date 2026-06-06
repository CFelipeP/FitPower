<?php

require_once __DIR__ . '/../../vendor/autoload.php';

function listPlans(): void {
    $db = getDB();

    $stmt = $db->query("
        SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY price_monthly
    ");
    $plans = $stmt->fetchAll();

    $result = array_map(function($p) {
        $featStmt = getDB()->prepare("SELECT text, included FROM plan_features WHERE plan_id = ? ORDER BY sort_order");
        $featStmt->execute([$p['id']]);
        $features = $featStmt->fetchAll();

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
        'planName' => $sub['plan_name'],
        'billing' => $sub['billing'],
        'price' => $sub['billing'] === 'yearly' ? $sub['price_yearly'] : $sub['price_monthly'],
        'status' => $sub['status'],
        'startedAt' => $sub['starts_at'],
        'endsAt' => $sub['ends_at'],
    ]);
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
                    'unit_amount' => round($price * 100),
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
            ],
        ]);

        success(['url' => $session->url, 'session_id' => $session->id]);
    } catch (\Exception $e) {
        error('Stripe error: ' . $e->getMessage());
    }
}
