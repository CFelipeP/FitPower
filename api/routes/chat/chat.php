<?php
//test
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
    if (!$stmt->fetch()) error('Conversation not found', 404);
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

    $errors = validate($input, ['content' => 'required|string|max:5000']);
    if ($errors) error('Validation error', 422, $errors);

    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND (participant_one = ? OR participant_two = ?)");
    $stmt->execute([$convId, $userId, $userId]);
    if (!$stmt->fetch()) error('Conversation not found', 404);
    $content = trim($input['content']);
    $db->prepare("INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)")
        ->execute([$convId, $userId, $content]);
    $db->prepare("UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?")
        ->execute([$content, $convId]);
    success(['id' => (int)$db->lastInsertId()], 'Message sent', 201);
}

function startConversation(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();
    $otherId = (int)($input['userId'] ?? 0);
    if (!$otherId || $otherId === $userId) error('Invalid user', 422);
    $db = getDB();
    // The target user must exist (otherwise the FK insert would 500).
    $userStmt = $db->prepare("SELECT id FROM users WHERE id = ? AND status != 'suspended'");
    $userStmt->execute([$otherId]);
    if (!$userStmt->fetch()) error('Invalid user', 422);
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
    if (!$c) error('Error getting conversation', 500);
    $otherName = $c['participant_one'] == $userId ? $c['p2_name'] : $c['p1_name'];
    $otherPhoto = $c['participant_one'] == $userId ? $c['p2_photo'] : $c['p1_photo'];
    success([
        'id' => $convId,
        'otherUserId' => (int)$otherId,
        'otherUserName' => $otherName,
        'otherUserPhoto' => $otherPhoto,
        'lastMessage' => $c['last_message'],
        'lastMessageAt' => $c['last_message_at'],
    ], $existing ? 'Existing conversation' : 'Conversation created', $existing ? 200 : 201);
}

/**
 * Marks a conversation as read for the current user (QA-audit fix:
 * the frontend ChatMessenger called PUT /conversations/{id}/read which
 * did not exist).
 */
function markConversationRead(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND (participant_one = ? OR participant_two = ?)");
    $stmt->execute([(int)$id, $auth['sub'], $auth['sub']]);
    if (!$stmt->fetch()) {
        error('Conversation not found', 404);
    }
    $db->prepare("INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE last_read_at = NOW()")
        ->execute([(int)$id, $auth['sub']]);
    success(null, 'Conversation marked as read');
}
