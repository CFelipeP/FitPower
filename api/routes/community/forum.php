<?php

require_once __DIR__ . '/leaderboard.php';

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
    if (!$topic) error('Topic not found', 404);

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
    $rules = [
        'title' => 'required|string|min:3|max:255',
        'content' => 'required|string|min:10|max:20000',
        'category' => 'string|max:100',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    $db = getDB();
    $tags = $input['tags'] ?? [];
    if (!is_array($tags)) $tags = [];
    $tags = array_slice(array_map('strval', $tags), 0, 10);
    $db->prepare("INSERT INTO forum_topics (user_id, title, content, category, tags) VALUES (?, ?, ?, ?, ?)")
        ->execute([$auth['sub'], $input['title'], $input['content'], $input['category'] ?? null, json_encode($tags)]);

    $topicId = (int)$db->lastInsertId();
    updateLeaderboardPoints($auth['sub'], 'forum_posts', 10);

    success(['id' => $topicId], 'Topic created', 201);
}

function createReply(): void {
    $auth = requireAuth();
    $topicId = (int)($_GET['topic_id'] ?? 0);
    if (!$topicId) error('topic_id required', 400);

    $input = getJsonInput();
    $rules = ['content' => 'required|string|min:1|max:10000'];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    $db = getDB();
    $stmt = $db->prepare("SELECT id, is_locked FROM forum_topics WHERE id = ? AND status = 'active'");
    $stmt->execute([$topicId]);
    $topic = $stmt->fetch();
    if (!$topic) error('Topic not found', 404);
    if ($topic['is_locked']) error('This topic is locked', 403);

    $db->prepare("INSERT INTO forum_replies (topic_id, user_id, content) VALUES (?, ?, ?)")
        ->execute([$topicId, $auth['sub'], $input['content']]);

    updateLeaderboardPoints($auth['sub'], 'forum_posts', 5);

    success(['id' => (int)$db->lastInsertId()], 'Reply posted', 201);
}

function toggleLike(): void {
    $auth = requireAuth();
    $replyId = (int)($_GET['reply_id'] ?? 0);
    if (!$replyId) error('reply_id required', 400);

    $db = getDB();
    $replyCheck = $db->prepare("SELECT id FROM forum_replies WHERE id = ?");
    $replyCheck->execute([$replyId]);
    if (!$replyCheck->fetch()) error('Reply not found', 404);

    $stmt = $db->prepare("SELECT 1 FROM forum_likes WHERE user_id = ? AND reply_id = ?");
    $stmt->execute([$auth['sub'], $replyId]);
    if ($stmt->fetch()) {
        $db->prepare("DELETE FROM forum_likes WHERE user_id = ? AND reply_id = ?")->execute([$auth['sub'], $replyId]);
        success(null, 'Like removed');
    } else {
        $db->prepare("INSERT INTO forum_likes (user_id, reply_id) VALUES (?, ?)")->execute([$auth['sub'], $replyId]);
        success(null, 'Like added');
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
    if (!$topic) error('Topic not found', 404);
    $newPinned = $topic['is_pinned'] ? 0 : 1;
    $db->prepare("UPDATE forum_topics SET is_pinned = ? WHERE id = ?")->execute([$newPinned, (int)$id]);
    success(null, $newPinned ? 'Topic pinned' : 'Topic unpinned');
}

function lockTopic(string $id): void {
    requireRole('admin', 'moderator');
    $db = getDB();
    $stmt = $db->prepare("SELECT id, is_locked FROM forum_topics WHERE id = ?");
    $stmt->execute([(int)$id]);
    $topic = $stmt->fetch();
    if (!$topic) error('Topic not found', 404);
    // The lock flag is a dedicated column; status is reserved for
    // active/archived lifecycle.
    $newLocked = $topic['is_locked'] ? 0 : 1;
    $db->prepare("UPDATE forum_topics SET is_locked = ? WHERE id = ?")->execute([$newLocked, (int)$id]);
    success(null, $newLocked ? 'Topic locked' : 'Topic unlocked');
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
    if (!$stmt->fetch()) error('Topic not found', 404);
    // Soft delete: archive the topic (status ENUM only allows active/archived).
    $db->prepare("UPDATE forum_topics SET status = 'archived', deleted_at = NOW() WHERE id = ?")->execute([(int)$id]);
    success(null, 'Topic deleted');
}
