<?php
function getFeed() {
    $auth = tryAuth();
    $db = getDB();
    
    $following = $auth 
        ? $db->prepare("SELECT following_id FROM followers WHERE follower_id = ?")
        : null;
    if ($following) {
        $following->execute([$auth['sub']]);
        $followingIds = array_column($following->fetchAll(), 'following_id');
        $followingIds[] = $auth['sub'];
    } else {
        $followingIds = [0];
    }
    
    $placeholders = implode(',', array_fill(0, count($followingIds), '?'));
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    $stmt = $db->prepare("
        SELECT p.*, u.first_name, u.last_name, u.photo,
               (SELECT COUNT(*) FROM social_likes WHERE post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM social_comments WHERE post_id = p.id) as comments_count
        FROM social_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id IN ($placeholders)
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $params = array_merge($followingIds, [$limit, $offset]);
    $stmt->execute($params);
    
    $posts = $stmt->fetchAll();
    
    if ($auth && !empty($posts)) {
        $postIds = array_column($posts, 'id');
        $idPlaceholders = implode(',', array_fill(0, count($postIds), '?'));
        $likeCheck = $db->prepare("SELECT post_id FROM social_likes WHERE post_id IN ($idPlaceholders) AND user_id = ?");
        $likeCheck->execute(array_merge($postIds, [$auth['sub']]));
        $likedPostIds = $likeCheck->fetchAll(PDO::FETCH_COLUMN);
        $likedSet = array_flip($likedPostIds);
        foreach ($posts as &$post) {
            $post['liked_by_me'] = isset($likedSet[$post['id']]);
        }
    }
    
    success($posts);
}

function createPost() {
    $auth = requireAuth();
    $input = getJsonInput();

    $errors = validate($input, [
        'content' => 'required|string|max:5000',
        'type' => 'string|max:50',
    ]);
    if ($errors) error('Validation error', 422, $errors);

    $content = trim($input['content']);
    $type = isset($input['type']) ? trim($input['type']) : 'status';
    if ($type === '') $type = 'status';

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO social_posts (user_id, content, type) VALUES (?, ?, ?)");
    $stmt->execute([$auth['sub'], $content, $type]);

    success(['id' => $db->lastInsertId()], 201);
}

function toggleLike() {
    $auth = requireAuth();
    $input = getJsonInput();
    $postId = (int)($input['post_id'] ?? 0);
    if (!$postId) error('Post ID required', 422);

    $db = getDB();
    // The post must exist (FK insert would 500 otherwise).
    $postCheck = $db->prepare("SELECT id FROM social_posts WHERE id = ?");
    $postCheck->execute([$postId]);
    if (!$postCheck->fetch()) error('Post not found', 404);

    $check = $db->prepare("SELECT id FROM social_likes WHERE post_id = ? AND user_id = ?");
    $check->execute([$postId, $auth['sub']]);

    if ($check->fetch()) {
        $db->prepare("DELETE FROM social_likes WHERE post_id = ? AND user_id = ?")->execute([$postId, $auth['sub']]);
        $db->prepare("UPDATE social_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?")->execute([$postId]);
        success(['liked' => false]);
    } else {
        $db->prepare("INSERT INTO social_likes (post_id, user_id) VALUES (?, ?)")->execute([$postId, $auth['sub']]);
        $db->prepare("UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = ?")->execute([$postId]);
        success(['liked' => true]);
    }
}

function addComment() {
    $auth = requireAuth();
    $input = getJsonInput();
    $postId = (int)($input['post_id'] ?? 0);
    if (!$postId) error('Post ID required', 422);

    $errors = validate($input, ['content' => 'required|string|max:2000']);
    if ($errors) error('Validation error', 422, $errors);

    $db = getDB();
    $postCheck = $db->prepare("SELECT id FROM social_posts WHERE id = ?");
    $postCheck->execute([$postId]);
    if (!$postCheck->fetch()) error('Post not found', 404);

    $stmt = $db->prepare("INSERT INTO social_comments (post_id, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$postId, $auth['sub'], trim($input['content'])]);
    $db->prepare("UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = ?")->execute([$postId]);

    success(['id' => $db->lastInsertId()], 201);
}

function getComments($postId) {
    $auth = tryAuth();
    $db = getDB();
    $stmt = $db->prepare("
        SELECT c.*, u.first_name, u.last_name, u.photo
        FROM social_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$postId]);
    success($stmt->fetchAll());
}

function followUser() {
    $auth = requireAuth();
    $input = getJsonInput();
    $followingId = (int)($input['user_id'] ?? 0);
    if (!$followingId) error('User ID required', 422);
    if ($followingId === (int)$auth['sub']) error('Cannot follow yourself', 422);

    $db = getDB();
    $userCheck = $db->prepare("SELECT id FROM users WHERE id = ? AND status != 'suspended'");
    $userCheck->execute([$followingId]);
    if (!$userCheck->fetch()) error('User not found', 404);

    $db->prepare("INSERT IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)")->execute([$auth['sub'], $followingId]);
    success(['following' => true]);
}

function unfollowUser() {
    $auth = requireAuth();
    $input = getJsonInput();
    $followingId = $input['user_id'] ?? null;
    if (!$followingId) error('User ID required');
    
    $db = getDB();
    $db->prepare("DELETE FROM followers WHERE follower_id = ? AND following_id = ?")->execute([$auth['sub'], $followingId]);
    success(['following' => false]);
}

function getFollowers($userId) {
    $auth = tryAuth();
    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, u.photo, f.created_at
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = ?
        ORDER BY f.created_at DESC
    ");
    $stmt->execute([$userId]);
    success($stmt->fetchAll());
}

function getFollowing($userId) {
    $auth = tryAuth();
    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, u.photo, f.created_at
        FROM followers f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
    ");
    $stmt->execute([$userId]);
    success($stmt->fetchAll());
}
