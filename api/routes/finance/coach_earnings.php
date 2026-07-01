<?php

function getCoachEarnings(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $days = min(365, max(1, (int)($_GET['days'] ?? 30)));
    $stmt = $db->prepare("
        SELECT ce.*, DATE_FORMAT(ce.created_at, '%Y-%m') as month
        FROM coach_earnings ce
        WHERE ce.coach_id = ?
        ORDER BY ce.created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$auth['sub'], $days * 3]);
    success(array_map(function($e) {
        return [
            'id' => (int)$e['id'],
            'amount' => (float)$e['amount'],
            'type' => $e['type'],
            'description' => $e['description'],
            'status' => $e['status'],
            'createdAt' => $e['created_at'],
            'month' => $e['month'],
        ];
    }, $stmt->fetchAll()));
}

function requestPayout(): void {
    $auth = requireRole('coach');
    $input = getJsonInput();
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0;
    if ($amount <= 0) error('Monto inválido', 422);
    $db = getDB();
    // Check available balance
    $bal = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM coach_earnings WHERE coach_id = ? AND status = 'available'");
    $bal->execute([$auth['sub']]);
    $available = (float)$bal->fetch()['total'];
    if ($amount > $available) error('Saldo insuficiente. Disponible: ' . $available, 400);
    // Create payout
    $db->prepare("INSERT INTO coach_payouts (coach_id, amount, status) VALUES (?, ?, 'pending')")
        ->execute([$auth['sub'], $amount]);
    // Mark earnings as paid
    $db->prepare("UPDATE coach_earnings SET status = 'paid' WHERE coach_id = ? AND status = 'available' LIMIT ?")
        ->execute([$auth['sub'], $amount]);
    success(['id' => (int)$db->lastInsertId()], 'Payout solicitado', 201);
}

function adminListPayouts(): void {
    requireRole('admin');
    $db = getDB();
    $status = $_GET['status'] ?? '';
    $where = $status ? "WHERE cp.status = ?" : '';
    $params = $status ? [$status] : [];
    $stmt = $db->prepare("
        SELECT cp.*, CONCAT(u.first_name, ' ', u.last_name) as coach_name, u.email as coach_email
        FROM coach_payouts cp
        JOIN users u ON u.id = cp.coach_id
        $where
        ORDER BY cp.created_at DESC
    ");
    $stmt->execute($params);
    success($stmt->fetchAll());
}

function adminApprovePayout(string $id): void {
    requireRole('admin');
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM coach_payouts WHERE id = ? AND status = 'pending'");
    $stmt->execute([(int)$id]);
    $payout = $stmt->fetch();
    if (!$payout) error('Payout no encontrado o ya procesado', 404);
    $db->prepare("UPDATE coach_payouts SET status = 'paid', paid_at = NOW(), stripe_transfer_id = ? WHERE id = ?")
        ->execute([$input['stripeTransferId'] ?? 'manual_' . bin2hex(random_bytes(8)), (int)$id]);
    logAdminAction($auth['sub'] ?? 0, 'approve_payout', "Payout \${$payout['amount']} aprobado para coach {$payout['coach_id']}");
    success(null, 'Payout aprobado');
}
