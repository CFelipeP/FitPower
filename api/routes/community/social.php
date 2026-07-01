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
    $content = $input['content'] ?? '';
    $type = $input['type'] ?? 'status';
    
    if (!trim($content)) error('Content is required');
    
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO social_posts (user_id, content, type) VALUES (?, ?, ?)");
    $stmt->execute([$auth['sub'], $content, $type]);
    
    success(['id' => $db->lastInsertId()], 201);
}

function toggleLike() {
    $auth = requireAuth();
    $input = getJsonInput();
    $postId = $input['post_id'] ?? null;
    if (!$postId) error('Post ID required');
    
    $db = getDB();
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
    $postId = $input['post_id'] ?? null;
    $content = $input['content'] ?? '';
    
    if (!$postId) error('Post ID required');
    if (!trim($content)) error('Comment content required');
    
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO social_comments (post_id, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$postId, $auth['sub'], $content]);
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
    $followingId = $input['user_id'] ?? null;
    if (!$followingId) error('User ID required');
    if ($followingId == $auth['sub']) error('Cannot follow yourself');
    
    $db = getDB();
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
