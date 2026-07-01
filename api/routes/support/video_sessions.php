<?php

function listVideoSessions(): void {
    $auth = requireAuth();
    $db = getDB();
    $userId = $auth['sub'];

    $stmt = $db->prepare("
        SELECT vs.*, 
            caller.first_name AS caller_first_name, caller.last_name AS caller_last_name,
            callee.first_name AS callee_first_name, callee.last_name AS callee_last_name
        FROM video_sessions vs
        LEFT JOIN users caller ON caller.id = vs.caller_id
        LEFT JOIN users callee ON callee.id = vs.callee_id
        WHERE vs.caller_id = ? OR vs.callee_id = ?
        ORDER BY vs.created_at DESC
    ");
    $stmt->execute([$userId, $userId]);
    $sessions = $stmt->fetchAll();

    $result = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'callerId' => (int)$s['caller_id'],
            'calleeId' => (int)$s['callee_id'],
            'callerName' => trim($s['caller_first_name'] . ' ' . $s['caller_last_name']),
            'calleeName' => trim($s['callee_first_name'] . ' ' . $s['callee_last_name']),
            'title' => $s['title'],
            'status' => $s['status'],
            'roomId' => 'vs-' . $s['id'],
            'createdAt' => $s['created_at'],
        ];
    }, $sessions);

    success($result);
}

function createVideoSession(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only coaches can start video sessions', 403);
    }
    $input = getJsonInput();

    if (empty($input['calleeId'])) {
        error('calleeId is required', 422);
    }

    $db = getDB();

    $userStmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $userStmt->execute([$input['calleeId']]);
    if (!$userStmt->fetch()) {
        error('User not found', 404);
    }

    $stmt = $db->prepare("
        INSERT INTO video_sessions (caller_id, callee_id, title, status)
        VALUES (?, ?, ?, 'scheduled')
    ");
    $stmt->execute([
        $auth['sub'],
        $input['calleeId'],
        $input['title'] ?? 'Video Session',
    ]);

    $sessionId = (int)$db->lastInsertId();

    success([
        'id' => $sessionId,
        'roomId' => 'vs-' . $sessionId,
        'status' => 'pending',
    ], 'Video session created', 201);
}

function updateVideoSessionStatus(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM video_sessions WHERE id = ?");
    $stmt->execute([$id]);
    $session = $stmt->fetch();

    if (!$session) {
        error('Video session not found', 404);
    }

    if ((int)$session['caller_id'] !== $auth['sub'] && (int)$session['callee_id'] !== $auth['sub']) {
        error('Not your session', 403);
    }

    $allowedStatuses = ['active', 'completed', 'cancelled'];
    $newStatus = $input['status'] ?? '';
    if (!in_array($newStatus, $allowedStatuses, true)) {
        error('Invalid status', 422);
    }

    $db->prepare("UPDATE video_sessions SET status = ? WHERE id = ?")
        ->execute([$newStatus, $id]);

    success(['roomId' => 'vs-' . $id], 'Status updated');
}
