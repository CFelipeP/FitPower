<?php
/**
 * Admin payments: every charge ever recorded, with filters and totals.
 * This is the single source of truth for "what money moved".
 */

function adminListPayments(): void {
    requireRole('admin');
    $db = getDB();

    $status = $_GET['status'] ?? '';
    $method = $_GET['method'] ?? '';
    $search = trim($_GET['search'] ?? '');
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['perPage'] ?? 25)));
    $offset = ($page - 1) * $perPage;

    $where = [];
    $params = [];

    if ($status !== '' && in_array($status, ['pending', 'completed', 'failed', 'refunded'], true)) {
        $where[] = "p.status = ?";
        $params[] = $status;
    }
    if ($method !== '' && in_array($method, ['card', 'paypal'], true)) {
        $where[] = "p.method = ?";
        $params[] = $method;
    }
    if ($search !== '') {
        $where[] = "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR p.stripe_invoice_id LIKE ?)";
        $like = "%$search%";
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    if ($from !== '') {
        $where[] = "p.created_at >= ?";
        $params[] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $where[] = "p.created_at <= ?";
        $params[] = $to . ' 23:59:59';
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Totals (independent of pagination).
    $totalParams = $params;
    $totalsStmt = $db->prepare("
        SELECT
            COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as collected_all,
            COALESCE(SUM(CASE WHEN p.status = 'completed' AND p.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN p.amount ELSE 0 END), 0) as collected_month,
            COALESCE(SUM(CASE WHEN p.status = 'failed' THEN p.amount ELSE 0 END), 0) as failed_all,
            COUNT(*) as total_rows
        FROM payments p
        JOIN users u ON u.id = p.user_id
        $whereClause
    ");
    $totalsStmt->execute($totalParams);
    $totals = $totalsStmt->fetch();

    // Count for pagination.
    $countStmt = $db->prepare("
        SELECT COUNT(*) FROM payments p JOIN users u ON u.id = p.user_id $whereClause
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    $totalPages = max(1, (int)ceil($total / $perPage));

    // List.
    $listStmt = $db->prepare("
        SELECT p.*, u.first_name, u.last_name, u.email, sp.name as plan_name
        FROM payments p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN user_subscriptions us ON us.id = p.subscription_id
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        $whereClause
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $perPage OFFSET $offset
    ");
    $listStmt->execute($params);

    $payments = array_map(function ($p) {
        return [
            'id' => (int)$p['id'],
            'userId' => (int)$p['user_id'],
            'userName' => trim($p['first_name'] . ' ' . $p['last_name']),
            'userEmail' => $p['email'],
            'subscriptionId' => $p['subscription_id'] ? (int)$p['subscription_id'] : null,
            'planName' => $p['plan_name'],
            'amount' => (float)$p['amount'],
            'currency' => $p['currency'] ?? 'USD',
            'method' => $p['method'],
            'type' => $p['type'],
            'status' => $p['status'],
            'stripeInvoiceId' => $p['stripe_invoice_id'],
            'paypalCaptureId' => $p['paypal_capture_id'] ?? null,
            'createdAt' => $p['created_at'],
        ];
    }, $listStmt->fetchAll());

    success([
        'payments' => $payments,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
        'totalPages' => $totalPages,
        'totals' => [
            'collectedAll' => (float)$totals['collected_all'],
            'collectedMonth' => (float)$totals['collected_month'],
            'failedAll' => (float)$totals['failed_all'],
            'totalRows' => (int)$totals['total_rows'],
        ],
    ]);
}
