<?php

function getCheckin(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $date = $_GET['date'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = ?");
    $stmt->execute([$userId, $date]);
    $row = $stmt->fetch();
    if (!$row) {
        success(null);
        return;
    }
    success([
        'id' => (int)$row['id'],
        'date' => $row['checkin_date'],
        'mood' => $row['mood'],
        'sleepHours' => $row['sleep_hours'] ? (float)$row['sleep_hours'] : null,
        'energyLevel' => $row['energy_level'] ? (int)$row['energy_level'] : null,
        'notes' => $row['notes'],
    ]);
}

function saveCheckin(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();

    $rules = [
        'mood' => 'in:great,good,okay,bad,terrible',
        'sleepHours' => 'numeric|min_value:0|max_value:24',
        'energyLevel' => 'numeric|min_value:1|max_value:10',
        'notes' => 'string|max:1000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $date = $input['date'] ?? date('Y-m-d');
    $stmt = $db->prepare("
        INSERT INTO daily_checkins (user_id, checkin_date, mood, sleep_hours, energy_level, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE mood = VALUES(mood), sleep_hours = VALUES(sleep_hours),
            energy_level = VALUES(energy_level), notes = VALUES(notes)
    ");
    $stmt->execute([
        $userId, $date,
        $input['mood'] ?? 'good',
        $input['sleepHours'] ?? null,
        $input['energyLevel'] ?? null,
        $input['notes'] ?? null,
    ]);

    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $lastCheckin = $db->prepare("SELECT created_at FROM daily_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1,1");
    $lastCheckin->execute([$userId]);
    $last = $lastCheckin->fetch();
    $streakIncrement = 1;
    if ($last) {
        $lastDate = date('Y-m-d', strtotime($last['created_at']));
        if ($lastDate === $yesterday) {
            $streakIncrement = 1;
        } elseif ($lastDate !== $today) {
            $streakIncrement = 0;
        }
    }
    $db->prepare("INSERT INTO leaderboard_entries (user_id, total_points, streak_days, updated_at) 
        VALUES (?, 5, 1, NOW()) 
        ON DUPLICATE KEY UPDATE total_points = total_points + 5, streak_days = streak_days + ?, updated_at = NOW()")
        ->execute([$userId, $streakIncrement]);
    require_once __DIR__ . '/../gamification/achievements.php';
    checkAndUnlockAchievements();

    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($auth['sub'], 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success');

    success(null, 'Check-in guardado');
}

function listCheckins(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();
    $days = min(90, max(1, (int)($_GET['days'] ?? 30)));
    $stmt = $db->prepare("SELECT * FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ?");
    $stmt->execute([$userId, $days]);
    $result = array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'date' => $r['checkin_date'],
            'mood' => $r['mood'],
            'sleepHours' => $r['sleep_hours'] ? (float)$r['sleep_hours'] : null,
            'energyLevel' => $r['energy_level'] ? (int)$r['energy_level'] : null,
        ];
    }, $stmt->fetchAll());
    success($result);
}
