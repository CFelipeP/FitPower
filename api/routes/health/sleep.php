<?php

function getSleep(): void {
    $auth = requireAuth();
    $db = getDB();
    $days = min(90, max(1, (int)($_GET['days'] ?? 7)));
    $stmt = $db->prepare("SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?");
    $stmt->execute([$auth['sub'], $days]);
    success(array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'date' => $s['date'],
            'hours' => (float)$s['hours'],
            'quality' => $s['quality'],
            'notes' => $s['notes'],
        ];
    }, $stmt->fetchAll()));
}

function saveSleep(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['hours' => 'required|numeric|min_value:0|max_value:24', 'quality' => 'in:poor,fair,good,great'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $date = $input['date'] ?? date('Y-m-d');
    $db->prepare("INSERT INTO sleep_logs (user_id, date, hours, quality, notes) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE hours = VALUES(hours), quality = VALUES(quality), notes = VALUES(notes)")
        ->execute([$auth['sub'], $date, $input['hours'], $input['quality'] ?? 'good', $input['notes'] ?? null]);
    success(null, 'Sueño guardado');
}
