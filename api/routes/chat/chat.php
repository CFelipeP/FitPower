<?php

function listConversations(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $stmt = $db->prepare("
        SELECT c.*, 
            u1.first_name AS p1_name, u1.photo AS p1_photo,
            u2.first_name AS p2_name, u2.photo AS p2_photo
        FROM conversations c
        LEFT JOIN users u1 ON u1.id = c.participant_one
        LEFT JOIN users u2 ON u2.id = c.participant_two
        WHERE c.participant_one = ? OR c.participant_two = ?
        ORDER BY c.last_message_at DESC
    ");
    $stmt->execute([$userId, $userId]);
    $convs = $stmt->fetchAll();
    $result = array_map(function($c) use ($userId) {
        $otherId = $c['participant_one'] == $userId ? $c['participant_two'] : $c['participant_one'];
        $otherName = $c['participant_one'] == $userId ? $c['p2_name'] : $c['p1_name'];
        $otherPhoto = $c['participant_one'] == $userId ? $c['p2_photo'] : $c['p1_photo'];
        return [
            'id' => (int)$c['id'],
            'otherUserId' => (int)$otherId,
            'otherUserName' => $otherName,
            'otherUserPhoto' => $otherPhoto,
            'lastMessage' => $c['last_message'],
            'lastMessageAt' => $c['last_message_at'],
        ];
    }, $convs);
    success($result);
}

function getMessages(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $convId = (int)$params['id'];
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND (participant_one = ? OR participant_two = ?)");
    $stmt->execute([$convId, $userId, $userId]);
    if (!$stmt->fetch()) error('Conversación no encontrada', 404);
    $msgStmt = $db->prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC");
    $msgStmt->execute([$convId]);
    $msgs = array_map(function($m) {
        return [
            'id' => (int)$m['id'],
            'senderId' => (int)$m['sender_id'],
            'content' => $m['content'],
            'createdAt' => $m['created_at'],
        ];
    }, $msgStmt->fetchAll());
    success($msgs);
}

function sendMessage(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $convId = (int)$params['id'];
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND (participant_one = ? OR participant_two = ?)");
    $stmt->execute([$convId, $userId, $userId]);
    if (!$stmt->fetch()) error('Conversación no encontrada', 404);
    $content = $input['content'] ?? '';
    if (!$content) error('Mensaje vacío', 422);
    $db->prepare("INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)")
        ->execute([$convId, $userId, $content]);
    $db->prepare("UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?")
        ->execute([$content, $convId]);
    success(['id' => (int)$db->lastInsertId()], 'Mensaje enviado', 201);
}

function startConversation(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();
    $otherId = (int)($input['userId'] ?? 0);
    if (!$otherId || $otherId === $userId) error('Usuario inválido', 422);
    $db = getDB();
    $stmt = $db->prepare("
        SELECT id FROM conversations 
        WHERE (participant_one = ? AND participant_two = ?) OR (participant_one = ? AND participant_two = ?)
    ");
    $stmt->execute([$userId, $otherId, $otherId, $userId]);
    $existing = $stmt->fetchColumn();
    if ($existing) {
        $convId = (int)$existing;
    } else {
        $db->prepare("INSERT INTO conversations (participant_one, participant_two) VALUES (?, ?)")
            ->execute([$userId, $otherId]);
        $convId = (int)$db->lastInsertId();
    }
    $convStmt = $db->prepare("
        SELECT c.*, 
            u1.first_name AS p1_name, u1.photo AS p1_photo,
            u2.first_name AS p2_name, u2.photo AS p2_photo
        FROM conversations c
        LEFT JOIN users u1 ON u1.id = c.participant_one
        LEFT JOIN users u2 ON u2.id = c.participant_two
        WHERE c.id = ?
    ");
    $convStmt->execute([$convId]);
    $c = $convStmt->fetch();
    if (!$c) error('Error al obtener conversación', 500);
    $otherName = $c['participant_one'] == $userId ? $c['p2_name'] : $c['p1_name'];
    $otherPhoto = $c['participant_one'] == $userId ? $c['p2_photo'] : $c['p1_photo'];
    success([
        'id' => $convId,
        'otherUserId' => (int)$otherId,
        'otherUserName' => $otherName,
        'otherUserPhoto' => $otherPhoto,
        'lastMessage' => $c['last_message'],
        'lastMessageAt' => $c['last_message_at'],
    ], $existing ? 'Conversación existente' : 'Conversación creada', $existing ? 200 : 201);
}
