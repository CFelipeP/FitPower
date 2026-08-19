<?php

function listNotifications(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $unreadOnly = ($_GET['unread'] ?? '') === 'true';

    $where = 'user_id = ?';
    $params = [$userId];
    if ($unreadOnly) {
        $where .= ' AND is_read = 0';
    }

    // Count for pagination + unread badge.
    $countStmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    $hasMore = $offset + $perPage < $total;

    $unreadStmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $unreadStmt->execute([$userId]);
    $unreadCount = (int)$unreadStmt->fetchColumn();

    $stmt = $db->prepare("SELECT * FROM notifications WHERE $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    $result = array_map(function($n) {
        return [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'title' => $n['title'],
            'body' => $n['message'],
            'link' => $n['link'] ?? null,
            'read_at' => $n['is_read'] ? $n['created_at'] : null,
            'createdAt' => $n['created_at'],
        ];
    }, $stmt->fetchAll());

    success([
        'notifications' => $result,
        'hasMore' => $hasMore,
        'total' => $total,
        'unreadCount' => $unreadCount,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function markRead(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $id = (int)$params['id'];
    $db = getDB();
    $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
        ->execute([$id, $userId]);
    success(null, 'Notification marked as read');
}

function markAllRead(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
        ->execute([$userId]);
    success(null, 'All marked as read');
}

function deleteNotification(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $id = (int)$params['id'];
    $db = getDB();
    $db->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")
        ->execute([$id, $userId]);
    success(null, 'Notification deleted');
}

function deleteAllNotifications(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $db->prepare("DELETE FROM notifications WHERE user_id = ?")
        ->execute([$userId]);
    success(null, 'All notifications deleted');
}

function createNotification(): void {
    requireRole('admin');
    $input = getJsonInput();
    $userId = (int)($input['userId'] ?? 0);
    if (!$userId) error('userId required', 422);

    $errors = validate($input, [
        'title' => 'required|string|min:1|max:255',
        'body' => 'string|max:5000',
        'type' => 'string|max:50',
    ]);
    if ($errors) error('Validation error', 422, $errors);

    $db = getDB();
    $userCheck = $db->prepare("SELECT id FROM users WHERE id = ?");
    $userCheck->execute([$userId]);
    if (!$userCheck->fetch()) error('User not found', 404);

    $db->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)")
        ->execute([
            $userId,
            $input['type'] ?? 'general',
            $input['title'],
            $input['body'] ?? '',
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Notification created', 201);
}

function broadcastNotification(): void {
    requireRole('admin');
    $input = getJsonInput();
    $rules = [
        'title' => 'required|string|min:1|max:255',
        'body' => 'required|string|min:1|max:5000',
        'type' => 'string|max:50',
        'role' => 'string|max:20',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();
    $role = $input['role'] ?? '';
    $where = "WHERE status = 'active'";
    $params = [];
    if ($role) { $where .= " AND role = ?"; $params[] = $role; }
    $users = $db->prepare("SELECT id FROM users $where");
    $users->execute($params);
    $users = $users->fetchAll();
    $stmt = $db->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)");
    $type = $input['type'] ?? 'broadcast';
    $userIds = [];
    foreach ($users as $user) {
        $stmt->execute([$user['id'], $type, $input['title'], $input['body']]);
        $userIds[] = $user['id'];
    }
    // Send push notifications via push-server (authenticated with the internal secret)
    try {
        $pushPayload = json_encode(['userIds' => $userIds, 'title' => $input['title'], 'body' => $input['body'], 'data' => ['type' => $type]]);
        $headers = ['Content-Type: application/json'];
        if (INTERNAL_API_SECRET !== '') {
            $headers[] = 'X-Internal-Secret: ' . INTERNAL_API_SECRET;
        }
        $ch = curl_init('http://127.0.0.1:5182/send-push-multi');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $pushPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    } catch (\Throwable $e) {}
    success(['sent' => count($users)], 'Notification sent', 201);
}
