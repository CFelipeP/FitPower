<?php

function adminAuditLog(): void {
    requireRole('admin');
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['perPage'] ?? 50)));
    $offset = ($page - 1) * $perPage;
    $actionFilter = $_GET['action'] ?? '';
    $adminFilter = $_GET['admin_id'] ?? '';
    $fromDate = $_GET['from'] ?? '';
    
    $where = [];
    $params = [];
    if ($actionFilter) { $where[] = "al.action = ?"; $params[] = $actionFilter; }
    if ($adminFilter) { $where[] = "al.admin_id = ?"; $params[] = (int)$adminFilter; }
    if ($fromDate) { $where[] = "al.created_at >= ?"; $params[] = $fromDate; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $countStmt = $db->prepare("SELECT COUNT(*) FROM admin_audit_log al $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    
    $stmt = $db->prepare("SELECT al.*, u.first_name, u.last_name, u.email FROM admin_audit_log al JOIN users u ON u.id = al.admin_id $whereClause ORDER BY al.created_at DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    $logs = $stmt->fetchAll();
    
    $result = array_map(function($l) {
        return [
            'id' => (int)$l['id'],
            'adminId' => (int)$l['admin_id'],
            'adminName' => $l['first_name'] . ' ' . $l['last_name'],
            'action' => $l['action'],
            'targetType' => $l['target_type'],
            'targetId' => (int)$l['target_id'],
            'details' => $l['details'] ? json_decode($l['details'], true) : null,
            'createdAt' => $l['created_at'],
        ];
    }, $logs);
    
    success(['logs' => $result, 'total' => $total, 'page' => $page, 'perPage' => $perPage]);
}
