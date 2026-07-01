<?php

function getMyAvailability(): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$auth['sub']]);
    $trainerId = $trainerStmt->fetchColumn();
    if (!$trainerId) error('Perfil de entrenador no encontrado', 404);

    $stmt = $db->prepare("SELECT * FROM coach_availability WHERE trainer_id = ? ORDER BY day_of_week, start_time");
    $stmt->execute([$trainerId]);
    $slots = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'dayOfWeek' => (int)$s['day_of_week'],
            'startTime' => $s['start_time'],
            'endTime' => $s['end_time'],
            'available' => (bool)$s['is_available'],
        ];
    }, $stmt->fetchAll());

    success($slots);
}

function updateMyAvailability(): void {
    $auth = requireRole('coach', 'admin');
    $input = getJsonInput();
    $db = getDB();

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$auth['sub']]);
    $trainerId = $trainerStmt->fetchColumn();
    if (!$trainerId) error('Perfil de entrenador no encontrado', 404);

    $slots = $input['slots'] ?? [];
    if (empty($slots)) error('Debe incluir slots de disponibilidad', 422);

    $db->prepare("DELETE FROM coach_availability WHERE trainer_id = ?")->execute([$trainerId]);

    $stmt = $db->prepare("INSERT INTO coach_availability (trainer_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, 1)");
    foreach ($slots as $slot) {
        $day = (int)($slot['dayOfWeek'] ?? 0);
        $start = $slot['startTime'] ?? '09:00';
        $end = $slot['endTime'] ?? '10:00';
        if ($day < 0 || $day > 6) continue;
        $stmt->execute([$trainerId, $day, $start, $end]);
    }

    success(null, 'Disponibilidad actualizada');
}

function getCoachAvailability(): void {
    $id = func_get_arg(0)['id'] ?? 0;
    $db = getDB();

    $stmt = $db->prepare("SELECT ca.*, t.first_name, t.last_name FROM coach_availability ca JOIN trainers t ON t.id = ca.trainer_id WHERE t.user_id = ? AND ca.is_available = 1 ORDER BY ca.day_of_week, ca.start_time");
    $stmt->execute([(int)$id]);
    $slots = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'dayOfWeek' => (int)$s['day_of_week'],
            'startTime' => $s['start_time'],
            'endTime' => $s['end_time'],
            'coachName' => $s['first_name'] . ' ' . $s['last_name'],
        ];
    }, $stmt->fetchAll());

    success($slots);
}
