<?php

function getMyAvailability(): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$auth['sub']]);
    $trainerId = $trainerStmt->fetchColumn();
    if (!$trainerId) error('Coach profile not found', 404);

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
    if (!$trainerId) error('Coach profile not found', 404);

    $slots = $input['slots'] ?? [];
    if (empty($slots)) error('Availability slots are required', 422);
    if (!is_array($slots) || count($slots) > 100) error('Maximum of 100 slots', 422);

    $db->prepare("DELETE FROM coach_availability WHERE trainer_id = ?")->execute([$trainerId]);

    $stmt = $db->prepare("INSERT INTO coach_availability (trainer_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, 1)");
    foreach ($slots as $slot) {
        if (!is_array($slot)) continue;
        $day = (int)($slot['dayOfWeek'] ?? 0);
        $start = isset($slot['startTime']) ? (string)$slot['startTime'] : '09:00';
        $end = isset($slot['endTime']) ? (string)$slot['endTime'] : '10:00';
        if ($day < 0 || $day > 6) continue;
        // Validate time format before hitting the TIME columns.
        $startOk = false; $endOk = false;
        foreach (['H:i:s', 'H:i'] as $fmt) {
            $t = DateTime::createFromFormat($fmt, $start);
            if ($t && $t->format($fmt) === $start) { $startOk = true; }
            $t = DateTime::createFromFormat($fmt, $end);
            if ($t && $t->format($fmt) === $end) { $endOk = true; }
        }
        if (!$startOk || !$endOk) continue;
        if (mb_strlen($start) > 8 || mb_strlen($end) > 8) continue;
        $stmt->execute([$trainerId, $day, $start, $end]);
    }

    success(null, 'Availability updated');
}

function getCoachAvailability(string $id): void {
    $db = getDB();

    $stmt = $db->prepare("SELECT ca.*, t.first_name, t.last_name FROM coach_availability ca JOIN trainers t ON t.id = ca.trainer_id WHERE t.id = ? AND ca.is_available = 1 ORDER BY ca.day_of_week, ca.start_time");
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
