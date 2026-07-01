<?php

function listNotifications(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$userId]);
    $result = array_map(function($n) {
        return [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'title' => $n['title'],
            'body' => $n['message'],
            'read_at' => $n['is_read'] ? $n['created_at'] : null,
            'createdAt' => $n['created_at'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function markRead(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $id = (int)$params['id'];
    $db = getDB();
    $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
        ->execute([$id, $userId]);
    success(null, 'Notificación marcada como leída');
}

function markAllRead(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
        ->execute([$userId]);
    success(null, 'Todas marcadas como leídas');
}

function createNotification(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $userId = (int)($input['userId'] ?? 0);
    if (!$userId) error('userId requerido', 422);
    $db = getDB();
    $db->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)")
        ->execute([
            $userId,
            $input['type'] ?? 'general',
            $input['title'] ?? '',
            $input['body'] ?? '',
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Notificación creada', 201);
}

function broadcastNotification(): void {
    requireRole('admin');
    $input = getJsonInput();
    $rules = ['title' => 'required|string|min:1', 'body' => 'required|string|min:1'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
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
    // Send push notifications via push-server
    try {
        $pushPayload = json_encode(['userIds' => $userIds, 'title' => $input['title'], 'body' => $input['body'], 'data' => ['type' => $type]]);
        $ch = curl_init('http://127.0.0.1:5182/send-push-multi');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $pushPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    } catch (\Throwable $e) {}
    success(['sent' => count($users)], 'Notificación transmitida', 201);
}
