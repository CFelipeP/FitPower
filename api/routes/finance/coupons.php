<?php

// Public validation used by the checkout page. Returns the coupon's discount
// parameters without consuming usage (consumption happens on payment success).
function validateCoupon(): void {
    $input = getJsonInput();
    $code = strtoupper(trim((string)($input['code'] ?? '')));
    if ($code === '') error('Code required', 422);
    $planId = $input['planId'] ?? $input['plan_id'] ?? null;

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())");
    $stmt->execute([$code]);
    $coupon = $stmt->fetch();

    if (!$coupon) error('This coupon is not valid for the selected plan.', 422);
    if ($coupon['max_uses'] !== null && (int)$coupon['current_uses'] >= (int)$coupon['max_uses']) {
        error('This coupon has reached its usage limit', 400);
    }
    if ($coupon['plan_id'] && $planId && (int)$coupon['plan_id'] !== (int)$planId) {
        error('This coupon is not valid for the selected plan.', 422);
    }

    success([
        'code' => $coupon['code'],
        'discount_pct' => (float)($coupon['discount_pct'] ?? 0),
        'discount_amount' => (float)($coupon['discount_amount'] ?? 0),
        'plan_id' => $coupon['plan_id'] ? (int)$coupon['plan_id'] : null,
    ]);
}

function listCoupons(): void {
    requireRole('admin');
    $db = getDB();
    $stmt = $db->query("SELECT * FROM coupons ORDER BY created_at DESC");
    success($stmt->fetchAll());
}

function createCoupon(): void {
    requireRole('admin');
    $input = getJsonInput();
    $rules = [
        'code' => 'required|string|min:3|max:50',
        'discountPct' => 'numeric|min_value:0|max_value:100',
        'discountAmount' => 'numeric|min_value:0|max_value:99999',
        'planId' => 'numeric|min_value:1',
        'maxUses' => 'numeric|min_value:1|max_value:1000000',
        'expiresAt' => 'date',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();

    // Friendly duplicate-code error instead of a raw SQL 500.
    $code = strtoupper(trim($input['code']));
    $dupStmt = $db->prepare("SELECT id FROM coupons WHERE code = ?");
    $dupStmt->execute([$code]);
    if ($dupStmt->fetch()) error('A coupon with this code already exists', 409);

    $stmt = $db->prepare("INSERT INTO coupons (code, discount_pct, discount_amount, plan_id, max_uses, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $code,
        isset($input['discountPct']) && $input['discountPct'] !== '' ? (float)$input['discountPct'] : null,
        isset($input['discountAmount']) && $input['discountAmount'] !== '' ? (float)$input['discountAmount'] : null,
        isset($input['planId']) && $input['planId'] !== '' ? (int)$input['planId'] : null,
        isset($input['maxUses']) && $input['maxUses'] !== '' ? (int)$input['maxUses'] : null,
        $input['expiresAt'] ?? null,
        isset($input['isActive']) ? (int)(bool)$input['isActive'] : 1,
    ]);
    success(['id' => (int)$db->lastInsertId()], 'Coupon created', 201);
}

function deleteCoupon(string $id): void {
    requireRole('admin');
    $db = getDB();
    $db->prepare("DELETE FROM coupons WHERE id = ?")->execute([(int)$id]);
    success(null, 'Coupon deleted');
}

function updateCoupon(string $id): void {
    requireRole('admin');
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM coupons WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Coupon not found', 404);

    $rules = [];
    if (isset($input['code'])) $rules['code'] = 'string|min:3|max:50';
    if (isset($input['discountPct'])) $rules['discountPct'] = 'numeric|min_value:0|max_value:100';
    if (isset($input['discountAmount'])) $rules['discountAmount'] = 'numeric|min_value:0|max_value:99999';
    if (isset($input['planId'])) $rules['planId'] = 'numeric|min_value:1';
    if (isset($input['maxUses'])) $rules['maxUses'] = 'numeric|min_value:1|max_value:1000000';
    if (isset($input['expiresAt'])) $rules['expiresAt'] = 'date';
    if ($rules) {
        $errors = validate($input, $rules);
        if ($errors) error('Validation error', 422, $errors);
    }

    $fieldMap = [
        'code' => 'code',
        'discountPct' => 'discount_pct',
        'discountAmount' => 'discount_amount',
        'planId' => 'plan_id',
        'maxUses' => 'max_uses',
        'expiresAt' => 'expires_at',
    ];
    $updates = [];
    $params = [];
    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }
    if (empty($updates)) error('No fields to update', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE coupons SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    $auth = requireRole('admin');
    logAdminAction($auth['sub'], 'update', 'coupon', (int)$id);
    success(null, 'Coupon updated');
}
