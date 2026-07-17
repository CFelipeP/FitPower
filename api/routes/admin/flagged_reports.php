<?php

function adminListFlaggedReports(): void {
    requireRole('admin');
    $db = getDB();
    $status = $_GET['status'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $where = '';
    $params = [];
    if ($status) {
        $where = "WHERE cr.status = ?";
        $params[] = $status;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM content_reports cr $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT cr.*, CONCAT(u.first_name, ' ', u.last_name) as reporter_name, u.email as reporter_email
        FROM content_reports cr
        LEFT JOIN users u ON u.id = cr.reporter_id
        $where
        ORDER BY cr.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $reports = $stmt->fetchAll();

    $result = array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'reporterId' => (int)$r['reporter_id'],
            'reporterName' => $r['reporter_name'] ?? 'Unknown',
            'contentType' => $r['content_type'],
            'contentId' => (int)$r['content_id'],
            'reason' => $r['reason'],
            'status' => $r['status'],
            'createdAt' => $r['created_at'],
        ];
    }, $reports);

    success([
        'reports' => $result,
        'total' => $total,
        'page' => $page,
    ]);
}

function adminUpdateFlaggedReport(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $status = $input['status'] ?? '';

    if (!in_array($status, ['reviewed', 'dismissed', 'action_taken'], true)) {
        error('Estado inválido', 422);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM content_reports WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) {
        error('Reporte no encontrado', 404);
    }

    $db->prepare("UPDATE content_reports SET status = ? WHERE id = ?")
        ->execute([$status, (int)$id]);

    logAdminAction($auth['sub'], 'review_report', 'content_report', (int)$id, ['status' => $status]);
    success(null, 'Reporte actualizado');
}
