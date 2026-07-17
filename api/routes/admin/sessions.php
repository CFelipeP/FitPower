<?php

function adminListSessions(): void {
    requireRole('admin');
    $db = getDB();
    $status = $_GET['status'] ?? '';
    $date = $_GET['date'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 50)));
    $offset = ($page - 1) * $perPage;

    $where = [];
    $params = [];
    if ($status) { $where[] = "s.status = ?"; $params[] = $status; }
    if ($date) { $where[] = "s.date = ?"; $params[] = $date; }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM sessions s $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT s.*, CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM sessions s
        LEFT JOIN trainers t ON t.id = s.trainer_id
        $whereClause
        ORDER BY s.date DESC, s.start_time ASC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);

    $sessions = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'title' => $s['title'],
            'date' => $s['date'],
            'startTime' => $s['start_time'],
            'endTime' => $s['end_time'],
            'type' => $s['type'],
            'status' => $s['status'],
            'trainerName' => $s['trainer_name'] ?? 'Unassigned',
            'maxParticipants' => (int)$s['max_participants'],
            'createdAt' => $s['created_at'],
        ];
    }, $stmt->fetchAll());

    success([
        'sessions' => $sessions,
        'total' => $total,
        'page' => $page,
    ]);
}
