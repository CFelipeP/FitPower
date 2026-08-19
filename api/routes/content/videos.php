<?php

function listVideos(): void {
    requireAuth();
    $db = getDB();
    $category = $_GET['category'] ?? '';
    $exerciseId = $_GET['exercise_id'] ?? '';
    $search = $_GET['search'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    if ($category) {
        $where[] = "category = ?";
        $params[] = $category;
    }
    if ($exerciseId) {
        $where[] = "exercise_id = ?";
        $params[] = (int)$exerciseId;
    }
    if ($search) {
        $where[] = "(title LIKE ? OR description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM video_library $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $params[] = $limit;
    $params[] = $offset;
    $stmt = $db->prepare("SELECT v.*, u.first_name AS coach_first_name, u.last_name AS coach_last_name, el.name AS exercise_name FROM video_library v LEFT JOIN users u ON u.id = v.coach_id LEFT JOIN exercise_library el ON el.id = v.exercise_id $whereClause ORDER BY v.created_at DESC LIMIT ? OFFSET ?");
    $stmt->execute($params);
    $videos = array_map(function($v) {
        return [
            'id' => (int)$v['id'],
            'title' => $v['title'],
            'description' => $v['description'],
            'filePath' => $v['file_path'],
            'thumbnailUrl' => $v['thumbnail_url'],
            'category' => $v['category'],
            'exerciseId' => $v['exercise_id'] ? (int)$v['exercise_id'] : null,
            'exerciseName' => $v['exercise_name'],
            'coachId' => $v['coach_id'] ? (int)$v['coach_id'] : null,
            'coachName' => trim(($v['coach_first_name'] ?? '') . ' ' . ($v['coach_last_name'] ?? '')) ?: null,
            'durationSeconds' => (int)$v['duration_seconds'],
            'fileSizeBytes' => (int)$v['file_size_bytes'],
            'mimeType' => $v['mime_type'],
            'tags' => $v['tags'] ? json_decode($v['tags'], true) : null,
            'isFeatured' => (bool)$v['is_featured'],
            'createdAt' => $v['created_at'],
        ];
    }, $stmt->fetchAll());

    success([
        'videos' => $videos,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
    ]);
}

function uploadVideo(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only administrators and coaches can upload videos', 403);
    }

    $title = trim($_POST['title'] ?? '');
    if (!$title) {
        $originalName = $_FILES['video']['name'] ?? 'video';
        $title = pathinfo($originalName, PATHINFO_FILENAME);
    }
    if (mb_strlen($title) > 255) {
        $title = mb_substr($title, 0, 255);
    }
    $description = trim((string)($_POST['description'] ?? ''));
    if (mb_strlen($description) > 5000) {
        error('The description is too long', 422);
    }

    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        error('Error uploading the video file', 400);
    }

    $allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $_FILES['video']['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimes, true)) {
        error('Video type not allowed. Only MP4, WebM and MOV', 422);
    }

    $maxSize = 500 * 1024 * 1024;
    if ($_FILES['video']['size'] > $maxSize) {
        error('The video exceeds the maximum size of 500MB', 422);
    }

    $uploadDir = __DIR__ . '/../../uploads/videos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('vid_') . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['video']['tmp_name'], $destination)) {
        error('Error saving the file', 500);
    }

    $filePath = 'uploads/videos/' . $filename;
    $description = $_POST['description'] ?? '';
    $category = $_POST['category'] ?? 'exercise_demo';
    $exerciseId = !empty($_POST['exercise_id']) ? (int)$_POST['exercise_id'] : null;
    $duration = (int)($_POST['duration_seconds'] ?? 0);
    $tags = !empty($_POST['tags']) ? $_POST['tags'] : null;
    $isFeatured = !empty($_POST['is_featured']) ? 1 : 0;

    if ($tags && is_string($tags)) {
        $decoded = json_decode($tags, true);
        $tags = $decoded !== null ? json_encode($decoded) : null;
    } elseif (is_array($tags)) {
        $tags = json_encode($tags);
    } else {
        $tags = null;
    }

    $expectedCategories = ['exercise_demo', 'coach_feedback', 'coaching_session', 'educational'];
    if (!in_array($category, $expectedCategories, true)) {
        $category = 'exercise_demo';
    }

    $db = getDB();
    $stmt = $db->prepare(
        "INSERT INTO video_library (title, description, file_path, thumbnail_url, category, exercise_id, coach_id, duration_seconds, file_size_bytes, mime_type, tags, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $title,
        $description,
        $filePath,
        null,
        $category,
        $exerciseId,
        (int)$auth['sub'],
        $duration,
        $_FILES['video']['size'],
        $mimeType,
        $tags,
        $isFeatured,
    ]);

    $id = (int)$db->lastInsertId();

    success([
        'id' => $id,
        'title' => $title,
        'filePath' => $filePath,
    ], 'Video uploaded successfully', 201);
}

function deleteVideo(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('You do not have permission to delete videos', 403);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT file_path FROM video_library WHERE id = ?");
    $stmt->execute([$id]);
    $video = $stmt->fetch();

    if (!$video) {
        error('Video not found', 404);
    }

    $filePath = __DIR__ . '/../../' . $video['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $stmt = $db->prepare("DELETE FROM video_library WHERE id = ?");
    $stmt->execute([$id]);

    success(null, 'Video deleted');
}

function updateVideo(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('You do not have permission to edit videos', 403);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM video_library WHERE id = ?");
    $stmt->execute([$id]);
    $video = $stmt->fetch();

    if (!$video) {
        error('Video not found', 404);
    }

    $input = getJsonInput();
    $title = trim((string)($input['title'] ?? ''));
    $description = trim((string)($input['description'] ?? ''));
    $category = $input['category'] ?? $video['category'];
    $isFeatured = isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : $video['is_featured'];
    // tags must be a JSON string for the JSON column; arrays would crash PDO.
    $tags = $input['tags'] ?? $video['tags'];
    if (is_array($tags)) $tags = json_encode($tags);

    // Exercise link: coaches attach a training video to an exercise, and that
    // exercise (with its video) goes into Programs for clients to use.
    $exerciseId = array_key_exists('exercise_id', $input)
        ? (($input['exercise_id'] !== null && $input['exercise_id'] !== '') ? (int)$input['exercise_id'] : null)
        : ($video['exercise_id'] ? (int)$video['exercise_id'] : null);

    if ($title !== '') {
        if (mb_strlen($title) > 255) error('The title is too long', 422);
        if (mb_strlen($description) > 5000) error('The description is too long', 422);
        if (!is_string($tags) || mb_strlen($tags) > 1000) $tags = $video['tags'];
        $validCategories = ['exercise_demo', 'coach_feedback', 'coaching_session', 'educational', 'exercise_demo'];
        if (!in_array($category, $validCategories, true)) {
            $category = $video['category'];
        }

        $stmt = $db->prepare(
            "UPDATE video_library SET title = ?, description = ?, category = ?, is_featured = ?, tags = ?, exercise_id = ? WHERE id = ?"
        );
        $stmt->execute([$title, $description, $category, $isFeatured, $tags, $exerciseId, $id]);

        success([
            'id' => (int)$id,
            'title' => $title,
            'description' => $description,
            'category' => $category,
            'exerciseId' => $exerciseId,
        ], 'Video updated');
    } else {
        error('The title is required', 422);
    }
}

function createFeedback(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only coaches can send feedback', 403);
    }

    $clientId = (int)($_POST['client_id'] ?? 0);
    if (!$clientId) {
        error('The client ID is required', 422);
    }

    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        error('Error uploading the video file', 400);
    }

    $allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $_FILES['video']['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimes, true)) {
        error('Video type not allowed. Only MP4, WebM and MOV', 422);
    }

    $maxSize = 500 * 1024 * 1024;
    if ($_FILES['video']['size'] > $maxSize) {
        error('The video exceeds the maximum size of 500MB', 422);
    }

    $uploadDir = __DIR__ . '/../../uploads/video-feedback/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('fb_') . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['video']['tmp_name'], $destination)) {
        error('Error saving the file', 500);
    }

    $videoUrl = 'uploads/video-feedback/' . $filename;
    $notes = $_POST['notes'] ?? '';
    $workoutLogId = !empty($_POST['workout_log_id']) ? (int)$_POST['workout_log_id'] : null;

    $db = getDB();
    $stmt = $db->prepare(
        "INSERT INTO video_feedback (coach_id, client_id, workout_log_id, video_url, notes)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$auth['sub'],
        $clientId,
        $workoutLogId,
        $videoUrl,
        $notes,
    ]);

    success([
        'id' => (int)$db->lastInsertId(),
        'videoUrl' => $videoUrl,
    ], 'Feedback sent successfully', 201);
}

function getFeedback(string $clientId): void {
    $auth = requireAuth();
    $db = getDB();
    $currentUserId = (int)$auth['sub'];

    if ($auth['role'] === 'client' && $currentUserId !== (int)$clientId) {
        error('You do not have permission to view this feedback', 403);
    }

    $stmt = $db->prepare(
        "SELECT vf.*, u.first_name AS coach_first_name, u.last_name AS coach_last_name
         FROM video_feedback vf
         JOIN users u ON u.id = vf.coach_id
         WHERE vf.client_id = ?
         ORDER BY vf.created_at DESC"
    );
    $stmt->execute([$clientId]);
    $feedback = array_map(function($f) {
        return [
            'id' => (int)$f['id'],
            'coachId' => (int)$f['coach_id'],
            'coachName' => $f['coach_first_name'] . ' ' . $f['coach_last_name'],
            'clientId' => (int)$f['client_id'],
            'workoutLogId' => $f['workout_log_id'] ? (int)$f['workout_log_id'] : null,
            'videoUrl' => $f['video_url'],
            'notes' => $f['notes'],
            'isViewed' => (bool)$f['is_viewed'],
            'createdAt' => $f['created_at'],
        ];
    }, $stmt->fetchAll());

    if ($auth['role'] !== 'client') {
        success($feedback);
        return;
    }

    $updateStmt = $db->prepare("UPDATE video_feedback SET is_viewed = 1 WHERE client_id = ? AND is_viewed = 0");
    $updateStmt->execute([$clientId]);

    success($feedback);
}

function sendVideoFeedback(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only coaches can send feedback', 403);
    }

    $input = getJsonInput();

    $rules = [
        'clientId' => 'required|numeric',
        'videoId' => 'required|numeric',
        'message' => 'required|string|min:1|max:2000',
    ];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    $clientStmt = $db->prepare("SELECT id FROM users WHERE id = ? AND role = 'client'");
    $clientStmt->execute([(int)$input['clientId']]);
    if (!$clientStmt->fetch()) {
        error('Client not found', 404);
    }

    $videoStmt = $db->prepare("SELECT file_path FROM video_library WHERE id = ?");
    $videoStmt->execute([(int)$input['videoId']]);
    $video = $videoStmt->fetch();
    if (!$video) {
        error('Video not found', 404);
    }

    $stmt = $db->prepare(
        "INSERT INTO video_feedback (coach_id, client_id, workout_log_id, video_url, notes)
         VALUES (?, ?, NULL, ?, ?)"
    );
    $stmt->execute([
        (int)$auth['sub'],
        (int)$input['clientId'],
        $video['file_path'],
        $input['message'],
    ]);

    $feedbackId = (int)$db->lastInsertId();

    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity((int)$auth['sub'], 'feedback', 'Video feedback sent', 'Video', '#10b981', 'Sent', 'bg-success');

    success([
        'id' => $feedbackId,
        'videoUrl' => $video['file_path'],
    ], 'Feedback sent successfully', 201);
}
