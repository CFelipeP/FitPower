<?php

function adminListMedia(): void {
    requireRole('admin');
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $type = $_GET['type'] ?? '';

    $where = '';
    $params = [];
    if ($type) {
        $where = "WHERE m.file_type = ?";
        $params[] = $type;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM media_assets m $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name
        FROM media_assets m
        LEFT JOIN users u ON u.id = m.uploaded_by
        $where
        ORDER BY m.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);

    success([
        'assets' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function adminUploadMedia(): void {
    $auth = requireRole('admin');
    $db = getDB();

    if (empty($_FILES['file'])) {
        error('No se envió ningún archivo', 422);
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error('Error al subir el archivo', 500);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'zip'];
    if (!in_array($ext, $allowed, true)) {
        error('Formato no permitido', 422);
    }

    $imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    $videoExts = ['mp4', 'webm'];
    $docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
    $fileType = in_array($ext, $imageExts) ? 'image' : (in_array($ext, $videoExts) ? 'video' : (in_array($ext, $docExts) ? 'document' : 'other'));

    $dir = UPLOAD_DIR . '/media';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $dir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        error('Error al guardar el archivo', 500);
    }

    $mimeType = mime_content_type($dest) ?: 'application/octet-stream';

    $stmt = $db->prepare("
        INSERT INTO media_assets (file_name, file_path, file_type, file_size, mime_type, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $file['name'],
        'uploads/media/' . $filename,
        $fileType,
        $file['size'],
        $mimeType,
        $auth['sub'],
    ]);

    success([
        'id' => (int)$db->lastInsertId(),
        'file_name' => $file['name'],
        'file_path' => 'uploads/media/' . $filename,
        'file_type' => $fileType,
        'file_size' => $file['size'],
    ], 'Archivo subido', 201);
}

function adminDeleteMedia(string $id): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM media_assets WHERE id = ?");
    $stmt->execute([(int)$id]);
    $asset = $stmt->fetch();

    if (!$asset) {
        error('Archivo no encontrado', 404);
    }

    $filePath = UPLOAD_DIR . '/' . ltrim($asset['file_path'], '/');
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $db->prepare("DELETE FROM media_assets WHERE id = ?")->execute([(int)$id]);
    success(null, 'Archivo eliminado');
}
