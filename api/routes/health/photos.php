<?php

function listPhotos(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC");
    $stmt->execute([$userId]);
    $baseUrl = rtrim(APP_URL, '/') . '/api';
    $result = array_map(function($p) use ($baseUrl) {
        $url = $p['photo_url'];
        if ($url && !str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            $url = $baseUrl . '/' . ltrim($url, '/');
        }
        return [
            'id' => (int)$p['id'],
            'photoUrl' => $url,
            'photoType' => $p['photo_type'],
            'bodyWeight' => $p['body_weight'] ? (float)$p['body_weight'] : null,
            'notes' => $p['notes'],
            'takenAt' => $p['taken_at'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function uploadPhoto(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();

    $rules = [
        'photoType' => 'in:front,side,back,full,other',
        'bodyWeight' => 'numeric|min_value:20|max_value:500',
        'notes' => 'string|max:1000',
    ];

    // Support both URL and base64 image data
    if (!empty($input['photoUrl'])) {
        $rules['photoUrl'] = 'string|max:500';
    } elseif (!empty($input['photoData'])) {
        $rules['photoData'] = 'string';
    } else {
        error('Debe proporcionar una URL o una imagen', 422);
    }

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    // Determine final photo URL
    if (!empty($input['photoData'])) {
        $dir = UPLOAD_DIR . '/progress_photos';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $ext = 'jpg';
        $meta = '';
        if (preg_match('/^data:image\/(\w+);base64,/', $input['photoData'], $meta)) {
            $ext = $meta[1] === 'jpeg' ? 'jpg' : $meta[1];
        }
        $data = preg_replace('/^data:image\/\w+;base64,/', '', $input['photoData']);
        $data = base64_decode($data, true);
        if ($data === false) {
            error('Datos de imagen inválidos', 422);
        }
        $filename = $userId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        file_put_contents($dir . '/' . $filename, $data);
        $photoUrl = 'uploads/progress_photos/' . $filename;
    } else {
        $photoUrl = $input['photoUrl'];
    }

    $db = getDB();
    $db->prepare("INSERT INTO progress_photos (user_id, photo_url, photo_type, body_weight, notes, taken_at) VALUES (?, ?, ?, ?, ?, NOW())")
        ->execute([
            $userId,
            $photoUrl,
            $input['photoType'] ?? 'front',
            $input['bodyWeight'] ?? null,
            $input['notes'] ?? null,
        ]);
    success(['id' => (int)$db->lastInsertId(), 'photoUrl' => $photoUrl], 'Foto guardada', 201);
}

function deletePhoto(array $params): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $id = (int)$params['id'];
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM progress_photos WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);
    if (!$stmt->fetch()) error('Foto no encontrada', 404);
    $db->prepare("DELETE FROM progress_photos WHERE id = ? AND user_id = ?")->execute([$id, $userId]);
    success(null, 'Foto eliminada');
}
