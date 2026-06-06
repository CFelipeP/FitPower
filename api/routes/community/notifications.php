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
            'data' => json_decode($n['data'] ?? 'null', true),
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
    $db->prepare("INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)")
        ->execute([
            $userId,
            $input['type'] ?? 'general',
            $input['title'] ?? '',
            $input['body'] ?? '',
            isset($input['data']) ? json_encode($input['data']) : null,
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Notificación creada', 201);
}
