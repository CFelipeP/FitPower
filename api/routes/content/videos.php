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
    $stmt = $db->prepare("SELECT * FROM video_library $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?");
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
            'coachId' => $v['coach_id'] ? (int)$v['coach_id'] : null,
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
        error('Solo administradores y entrenadores pueden subir videos', 403);
    }

    $title = $_POST['title'] ?? '';
    if (!$title) {
        error('El título es requerido', 422);
    }

    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        error('Error al subir el archivo de video', 400);
    }

    $allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $_FILES['video']['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimes, true)) {
        error('Tipo de video no permitido. Solo MP4, WebM y MOV', 422);
    }

    $maxSize = 500 * 1024 * 1024;
    if ($_FILES['video']['size'] > $maxSize) {
        error('El video excede el tamaño máximo de 500MB', 422);
    }

    $uploadDir = __DIR__ . '/../../uploads/videos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('vid_') . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['video']['tmp_name'], $destination)) {
        error('Error al guardar el archivo', 500);
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
    ], 'Video subido exitosamente', 201);
}

function deleteVideo(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('No tienes permisos para eliminar videos', 403);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT file_path FROM video_library WHERE id = ?");
    $stmt->execute([$id]);
    $video = $stmt->fetch();

    if (!$video) {
        error('Video no encontrado', 404);
    }

    $filePath = __DIR__ . '/../../' . $video['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $stmt = $db->prepare("DELETE FROM video_library WHERE id = ?");
    $stmt->execute([$id]);

    success(null, 'Video eliminado');
}

function createFeedback(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Solo entrenadores pueden enviar feedback', 403);
    }

    $clientId = (int)($_POST['client_id'] ?? 0);
    if (!$clientId) {
        error('El ID del cliente es requerido', 422);
    }

    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        error('Error al subir el archivo de video', 400);
    }

    $allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $_FILES['video']['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimes, true)) {
        error('Tipo de video no permitido. Solo MP4, WebM y MOV', 422);
    }

    $maxSize = 500 * 1024 * 1024;
    if ($_FILES['video']['size'] > $maxSize) {
        error('El video excede el tamaño máximo de 500MB', 422);
    }

    $uploadDir = __DIR__ . '/../../uploads/video-feedback/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('fb_') . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['video']['tmp_name'], $destination)) {
        error('Error al guardar el archivo', 500);
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
    ], 'Feedback enviado exitosamente', 201);
}

function getFeedback(string $clientId): void {
    $auth = requireAuth();
    $db = getDB();
    $currentUserId = (int)$auth['sub'];

    if ($auth['role'] === 'client' && $currentUserId !== (int)$clientId) {
        error('No tienes permisos para ver este feedback', 403);
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
