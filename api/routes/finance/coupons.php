<?php

function listCoupons(): void {
    requireRole('admin');
    $db = getDB();
    $stmt = $db->query("SELECT * FROM coupons ORDER BY created_at DESC");
    success($stmt->fetchAll());
}

function createCoupon(): void {
    requireRole('admin');
    $input = getJsonInput();
    $rules = ['code' => 'required|string|min:3|max:50'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO coupons (code, discount_pct, discount_amount, plan_id, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        strtoupper($input['code']),
        isset($input['discountPct']) ? (float)$input['discountPct'] : null,
        isset($input['discountAmount']) ? (float)$input['discountAmount'] : null,
        isset($input['planId']) ? (int)$input['planId'] : null,
        isset($input['maxUses']) ? (int)$input['maxUses'] : null,
        $input['expiresAt'] ?? null,
    ]);
    success(['id' => (int)$db->lastInsertId()], 'Cupón creado', 201);
}

function deleteCoupon(string $id): void {
    requireRole('admin');
    $db = getDB();
    $db->prepare("DELETE FROM coupons WHERE id = ?")->execute([(int)$id]);
    success(null, 'Cupón eliminado');
}

function updateCoupon(string $id): void {
    requireRole('admin');
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM coupons WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Cupón no encontrado', 404);
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
    if (empty($updates)) error('No hay campos para actualizar', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE coupons SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    $auth = requireRole('admin');
    logAdminAction($auth['sub'], 'update', 'coupon', (int)$id);
    success(null, 'Cupón actualizado');
}
