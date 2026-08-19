<?php

function logWorkout(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();

    $errors = validate($input, [
        'sessionId' => 'numeric|min_value:1',
        'exercises' => 'array',
        'duration' => 'numeric|min_value:0|max_value:1440',
        'calories' => 'numeric|min_value:0|max_value:99999',
    ]);
    if ($errors) error('Validation error', 422, $errors);

    $sessionId = isset($input['sessionId']) ? (int)$input['sessionId'] : null;
    $exercises = $input['exercises'] ?? [];

    if (!is_array($exercises) || empty($exercises)) {
        error('You must include at least one exercise', 422);
    }
    if (count($exercises) > 100) {
        error('Maximum 100 exercises per log entry', 422);
    }

    $stmt = $db->prepare("INSERT INTO workout_logs (user_id, session_id, exercise_id, sets_completed, reps_completed, weight_used, notes, calories_burned, total_volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $ids = [];
    $totalCaloriesBurned = 0;

    foreach ($exercises as $ex) {
        if (!is_array($ex)) continue;
        $exerciseId = isset($ex['exerciseId']) && is_numeric($ex['exerciseId']) ? (int)$ex['exerciseId'] : null;
        $sets = isset($ex['sets']) && is_numeric($ex['sets']) ? min(255, max(0, (int)$ex['sets'])) : 0;
        $reps = isset($ex['reps']) && $ex['reps'] !== '' && $ex['reps'] !== null ? mb_substr((string)$ex['reps'], 0, 100) : null;
        $weight = isset($ex['weight']) && $ex['weight'] !== '' && $ex['weight'] !== null ? mb_substr((string)$ex['weight'], 0, 50) : null;
        $notes = isset($ex['notes']) && $ex['notes'] !== '' && $ex['notes'] !== null ? mb_substr((string)$ex['notes'], 0, 1000) : null;
        // Volume = sets × weight (only when the weight is numeric).
        $totalVolume = null;
        if (is_numeric($weight)) {
            $totalVolume = round($sets * (float)$weight, 2);
        }

        $caloriesPerSet = null;
        if (isset($ex['caloriesBurned']) && is_numeric($ex['caloriesBurned'])) {
            $caloriesPerSet = min(99999, max(0, (int)$ex['caloriesBurned']));
        } elseif ($exerciseId) {
            $calStmt = $db->prepare("SELECT calories_burned FROM exercise_library WHERE id = ?");
            $calStmt->execute([$exerciseId]);
            $calRow = $calStmt->fetch();
            if ($calRow && $calRow['calories_burned'] !== null) {
                $caloriesPerSet = (int)round((float)$calRow['calories_burned'] * $sets);
            }
        }

        $stmt->execute([$auth['sub'], $sessionId, $exerciseId, $sets, $reps, $weight, $notes, $caloriesPerSet, $totalVolume]);
        $ids[] = (int)$db->lastInsertId();
        if ($caloriesPerSet !== null) {
            $totalCaloriesBurned += $caloriesPerSet;
        }
    }

    if ($sessionId) {
        $db->prepare("UPDATE session_participants SET status = 'completed' WHERE session_id = ? AND user_id = ?")->execute([$sessionId, $auth['sub']]);
    }

    if ($totalCaloriesBurned > 0) {
        $userId = $auth['sub'];
        require_once __DIR__ . '/../community/leaderboard.php';
        updateLeaderboardPoints($userId, 'total_calories_burned', $totalCaloriesBurned);

        require_once __DIR__ . '/../gamification/achievements.php';
        checkAndUnlockAchievements();
    }

    success(['ids' => $ids, 'caloriesBurned' => $totalCaloriesBurned], 'Workout logged', 201);
}

function listWorkoutLogs(): void {
    $auth = requireAuth();
    $db = getDB();
    $sessionId = isset($_GET['sessionId']) ? (int)$_GET['sessionId'] : null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $where = "wl.user_id = ?";
    $params = [$auth['sub']];
    if ($sessionId) { $where .= " AND wl.session_id = ?"; $params[] = $sessionId; }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM workout_logs wl WHERE $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("SELECT wl.*, el.name as exercise_name, s.title as session_title FROM workout_logs wl LEFT JOIN exercise_library el ON el.id = wl.exercise_id LEFT JOIN sessions s ON s.id = wl.session_id WHERE $where ORDER BY wl.logged_at DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    $logs = array_map(function($l) {
        return [
            'id' => (int)$l['id'],
            'exerciseId' => $l['exercise_id'] ? (int)$l['exercise_id'] : null,
            'exerciseName' => $l['exercise_name'],
            'sessionId' => $l['session_id'] ? (int)$l['session_id'] : null,
            'sessionTitle' => $l['session_title'],
            'sets' => (int)$l['sets_completed'],
            'reps' => $l['reps_completed'],
            'weight' => $l['weight_used'],
            'notes' => $l['notes'],
            'caloriesBurned' => $l['calories_burned'] ? (int)$l['calories_burned'] : null,
            'loggedAt' => $l['logged_at'],
        ];
    }, $stmt->fetchAll());

    success(['logs' => $logs, 'total' => $total, 'page' => $page, 'perPage' => $perPage]);
}

function getWorkoutHeatmap(): void {
    $auth = requireAuth();
    $db = getDB();
    $year = (int)($_GET['year'] ?? date('Y'));
    $stmt = $db->prepare("SELECT DATE(logged_at) as date, COUNT(*) as count FROM workout_logs WHERE user_id = ? AND YEAR(logged_at) = ? GROUP BY DATE(logged_at) ORDER BY date");
    $stmt->execute([$auth['sub'], $year]);
    success($stmt->fetchAll());
}
