<?php

function listPhotos(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC");
    $stmt->execute([$userId]);
    $result = array_map(function($p) {
        return [
            'id' => (int)$p['id'],
            'photoUrl' => $p['photo_url'],
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
    $db = getDB();
    $db->prepare("INSERT INTO progress_photos (user_id, photo_url, photo_type, body_weight, notes, taken_at) VALUES (?, ?, ?, ?, ?, NOW())")
        ->execute([
            $userId,
            $input['photoUrl'] ?? '',
            $input['photoType'] ?? 'front',
            $input['bodyWeight'] ?? null,
            $input['notes'] ?? null,
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Foto guardada', 201);
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
