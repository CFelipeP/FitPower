<?php

function listHabits(): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC");
    $stmt->execute([$auth['sub']]);
    $habits = $stmt->fetchAll();
    $today = date('Y-m-d');
    $logStmt = $db->prepare("SELECT habit_id, completed FROM habit_logs WHERE user_id = ? AND date = ?");
    $logStmt->execute([$auth['sub'], $today]);
    $logs = [];
    foreach ($logStmt->fetchAll() as $l) { $logs[(int)$l['habit_id']] = (bool)$l['completed']; }
    $result = array_map(function($h) use ($logs) {
        return [
            'id' => (int)$h['id'],
            'name' => $h['name'],
            'icon' => $h['icon'],
            'color' => $h['color'],
            'completedToday' => $logs[(int)$h['id']] ?? false,
        ];
    }, $habits);
    success($result);
}

function createHabit(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['name' => 'required|string|min:1|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $db->prepare("INSERT INTO habits (user_id, name, icon, color) VALUES (?, ?, ?, ?)")
        ->execute([$auth['sub'], $input['name'], $input['icon'] ?? 'check', $input['color'] ?? '#4CAF50']);
    success(['id' => (int)$db->lastInsertId()], 'Hábito creado', 201);
}

function deleteHabit(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$id, $auth['sub']]);
    if (!$stmt->fetch()) error('Hábito no encontrado', 404);
    $db->prepare("DELETE FROM habits WHERE id = ? AND user_id = ?")->execute([(int)$id, $auth['sub']]);
    success(null, 'Hábito eliminado');
}

function toggleHabit(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $habitId = $input['habitId'] ?? 0;
    $date = $input['date'] ?? date('Y-m-d');
    $completed = filter_var($input['completed'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $db = getDB();
    $chk = $db->prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?");
    $chk->execute([(int)$habitId, $auth['sub']]);
    if (!$chk->fetch()) error('Hábito no encontrado', 404);
    $db->prepare("INSERT INTO habit_logs (habit_id, user_id, date, completed) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE completed = VALUES(completed)")
        ->execute([(int)$habitId, $auth['sub'], $date, $completed ? 1 : 0]);
    success(null, $completed ? 'Hábito completado' : 'Hábito desmarcado');
}
