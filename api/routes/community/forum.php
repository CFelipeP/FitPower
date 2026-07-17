<?php

function listTopics(): void {
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $category = $_GET['category'] ?? '';

    $where = "WHERE t.status = 'active'";
    $params = [];
    if ($category) {
        $where .= " AND t.category = ?";
        $params[] = $category;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM forum_topics t $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as user_name,
               (SELECT COUNT(*) FROM forum_replies WHERE topic_id = t.id) as reply_count
        FROM forum_topics t
        JOIN users u ON u.id = t.user_id
        $where
        ORDER BY t.is_pinned DESC, t.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);

    success([
        'topics' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
    ]);
}

function getTopic(string $id): void {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.photo as user_photo
        FROM forum_topics t
        JOIN users u ON u.id = t.user_id
        WHERE t.id = ?
    ");
    $stmt->execute([$id]);
    $topic = $stmt->fetch();
    if (!$topic) error('Tema no encontrado', 404);

    $db->prepare("UPDATE forum_topics SET views = views + 1 WHERE id = ?")->execute([$id]);

    $replyStmt = $db->prepare("
        SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.photo as user_photo,
               (SELECT COUNT(*) FROM forum_likes WHERE reply_id = r.id) as like_count
        FROM forum_replies r
        JOIN users u ON u.id = r.user_id
        WHERE r.topic_id = ?
        ORDER BY r.is_solution DESC, r.created_at ASC
    ");
    $replyStmt->execute([$id]);

    $auth = tryAuth();
    $likedReplies = [];
    if ($auth) {
        $likeStmt = $db->prepare("SELECT reply_id FROM forum_likes WHERE user_id = ?");
        $likeStmt->execute([$auth['sub']]);
        $likedReplies = $likeStmt->fetchAll(PDO::FETCH_COLUMN);
    }

    success([
        'topic' => $topic,
        'replies' => $replyStmt->fetchAll(),
        'likedReplies' => $likedReplies,
    ]);
}

function createTopic(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['title' => 'required|string|min:3|max:255', 'content' => 'required|string|min:10'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);

    $db = getDB();
    $db->prepare("INSERT INTO forum_topics (user_id, title, content, category, tags) VALUES (?, ?, ?, ?, ?)")
        ->execute([$auth['sub'], $input['title'], $input['content'], $input['category'] ?? null, json_encode($input['tags'] ?? [])]);

    $topicId = (int)$db->lastInsertId();
    updateLeaderboardPoints($auth['sub'], 'forum_posts', 10);

    success(['id' => $topicId], 'Tema creado', 201);
}

function createReply(): void {
    $auth = requireAuth();
    $topicId = $_GET['topic_id'] ?? '';
    if (!$topicId) error('topic_id requerido', 400);

    $input = getJsonInput();
    $rules = ['content' => 'required|string|min:1'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);

    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM forum_topics WHERE id = ? AND status = 'active'");
    $stmt->execute([$topicId]);
    if (!$stmt->fetch()) error('Tema no encontrado', 404);

    $db->prepare("INSERT INTO forum_replies (topic_id, user_id, content) VALUES (?, ?, ?)")
        ->execute([$topicId, $auth['sub'], $input['content']]);

    updateLeaderboardPoints($auth['sub'], 'forum_posts', 5);

    success(['id' => (int)$db->lastInsertId()], 'Respuesta publicada', 201);
}

function toggleLike(): void {
    $auth = requireAuth();
    $replyId = $_GET['reply_id'] ?? '';
    if (!$replyId) error('reply_id requerido', 400);

    $db = getDB();
    $stmt = $db->prepare("SELECT 1 FROM forum_likes WHERE user_id = ? AND reply_id = ?");
    $stmt->execute([$auth['sub'], $replyId]);
    if ($stmt->fetch()) {
        $db->prepare("DELETE FROM forum_likes WHERE user_id = ? AND reply_id = ?")->execute([$auth['sub'], $replyId]);
        success(null, 'Like removido');
    } else {
        $db->prepare("INSERT INTO forum_likes (user_id, reply_id) VALUES (?, ?)")->execute([$auth['sub'], $replyId]);
        success(null, 'Like agregado');
    }
}

function getForumCategories(): void {
    $db = getDB();
    $stmt = $db->query("SELECT DISTINCT category FROM forum_topics WHERE category IS NOT NULL AND status = 'active' ORDER BY category");
    success($stmt->fetchAll(PDO::FETCH_COLUMN));
}

function pinTopic(string $id): void {
    requireRole('admin', 'moderator');
    $db = getDB();
    $stmt = $db->prepare("SELECT id, is_pinned FROM forum_topics WHERE id = ?");
    $stmt->execute([(int)$id]);
    $topic = $stmt->fetch();
    if (!$topic) error('Tema no encontrado', 404);
    $newPinned = $topic['is_pinned'] ? 0 : 1;
    $db->prepare("UPDATE forum_topics SET is_pinned = ? WHERE id = ?")->execute([$newPinned, (int)$id]);
    success(null, $newPinned ? 'Tema fijado' : 'Tema desafijado');
}

function lockTopic(string $id): void {
    requireRole('admin', 'moderator');
    $db = getDB();
    $stmt = $db->prepare("SELECT id, status FROM forum_topics WHERE id = ?");
    $stmt->execute([(int)$id]);
    $topic = $stmt->fetch();
    if (!$topic) error('Tema no encontrado', 404);
    $newStatus = $topic['status'] === 'locked' ? 'active' : 'locked';
    $db->prepare("UPDATE forum_topics SET status = ? WHERE id = ?")->execute([$newStatus, (int)$id]);
    success(null, $newStatus === 'locked' ? 'Tema bloqueado' : 'Tema desbloqueado');
}

function adminListTopics(): void {
    requireRole('admin', 'moderator');
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $search = $_GET['search'] ?? '';

    $where = "WHERE 1=1";
    $params = [];
    if ($search) {
        $where .= " AND (t.title LIKE ? OR t.content LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM forum_topics t $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
               (SELECT COUNT(*) FROM forum_replies WHERE topic_id = t.id) as reply_count
        FROM forum_topics t
        JOIN users u ON u.id = t.user_id
        $where
        ORDER BY t.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $topics = $stmt->fetchAll();

    success([
        'topics' => $topics,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function adminDeleteTopic(string $id): void {
    requireRole('admin', 'moderator');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM forum_topics WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Tema no encontrado', 404);
    $db->prepare("UPDATE forum_topics SET status = 'deleted' WHERE id = ?")->execute([(int)$id]);
    success(null, 'Tema eliminado');
}
