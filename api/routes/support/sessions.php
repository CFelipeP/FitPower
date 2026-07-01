<?php

function listSessions(): void {
    $auth = requireAuth();
    $db = getDB();

    $programId = $_GET['program_id'] ?? '';
    $trainerId = $_GET['trainer_id'] ?? '';
    $date = $_GET['date'] ?? '';

    $where = [];
    $params = [];

    if ($programId) {
        $where[] = "s.program_id = ?";
        $params[] = $programId;
    }
    if ($trainerId) {
        $where[] = "s.trainer_id = ?";
        $params[] = $trainerId;
    }
    if ($date) {
        $where[] = "s.date = ?";
        $params[] = $date;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT s.*, 
            CONCAT(t.first_name, ' ', t.last_name) as trainer_name,
            p.name as program_name
        FROM sessions s
        LEFT JOIN trainers t ON t.id = s.trainer_id
        LEFT JOIN programs p ON p.id = s.program_id
        $whereClause
        ORDER BY s.date, s.start_time
    ");
    $stmt->execute($params);
    $sessions = $stmt->fetchAll();

    $result = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'programId' => $s['program_id'] ? (int)$s['program_id'] : null,
            'trainerId' => $s['trainer_id'] ? (int)$s['trainer_id'] : null,
            'trainerName' => $s['trainer_name'],
            'programName' => $s['program_name'],
            'title' => $s['title'],
            'description' => $s['description'],
            'date' => $s['date'],
            'startTime' => $s['start_time'],
            'endTime' => $s['end_time'],
            'type' => $s['type'],
            'status' => $s['status'],
            'rpe' => $s['rpe'] ? (int)$s['rpe'] : null,
            'rpeNotes' => $s['rpe_notes'],
        ];
    }, $sessions);

    success($result);
}

function createSession(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'title' => 'required|string|min:1|max:255',
        'date' => 'required|string',
        'description' => 'string|max:2000',
        'startTime' => 'string|max:10',
        'endTime' => 'string|max:10',
        'type' => 'in:group,1on1,video',
        'status' => 'in:scheduled,completed,cancelled',
        'rpe' => 'numeric|min_value:1|max_value:10',
        'rpeNotes' => 'string|max:1000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("
        INSERT INTO sessions (program_id, trainer_id, title, description, date, start_time, end_time, type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $input['programId'] ?? null,
        $input['trainerId'] ?? null,
        $input['title'],
        $input['description'] ?? null,
        $input['date'],
        $input['startTime'] ?? null,
        $input['endTime'] ?? null,
        $input['type'] ?? 'group',
        $input['status'] ?? 'scheduled',
    ]);

    $sessionId = (int)$db->lastInsertId();

    if (!empty($input['exercises'])) {
        $exStmt = $db->prepare("
            INSERT INTO exercises (session_id, name, sets, reps, weight, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($input['exercises'] as $i => $ex) {
            $exStmt->execute([
                $sessionId,
                $ex['name'] ?? '',
                $ex['sets'] ?? null,
                $ex['reps'] ?? null,
                $ex['weight'] ?? null,
                $ex['notes'] ?? null,
                $i + 1,
            ]);
        }
    }

    success(['id' => $sessionId], 'Sesión creada', 201);
}

function updateSession(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM sessions WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Sesión no encontrada', 404);
    }

    $validationRules = [];
    if (isset($input['title'])) $validationRules['title'] = 'string|min:1|max:255';
    if (isset($input['date'])) $validationRules['date'] = 'string';
    if (isset($input['description'])) $validationRules['description'] = 'string|max:2000';
    if (isset($input['startTime'])) $validationRules['startTime'] = 'string|max:10';
    if (isset($input['endTime'])) $validationRules['endTime'] = 'string|max:10';
    if (isset($input['type'])) $validationRules['type'] = 'in:group,1on1,video';
    if (isset($input['status'])) $validationRules['status'] = 'in:scheduled,completed,cancelled';
    if (isset($input['rpe'])) $validationRules['rpe'] = 'numeric|min_value:1|max_value:10';
    if (isset($input['rpeNotes'])) $validationRules['rpeNotes'] = 'string|max:1000';

    if ($validationRules) {
        $errors = validate($input, $validationRules);
        if ($errors) {
            error('Error de validación', 422, $errors);
        }
    }

    $fieldMap = [
        'title' => 'title',
        'description' => 'description',
        'date' => 'date',
        'startTime' => 'start_time',
        'endTime' => 'end_time',
        'type' => 'type',
        'status' => 'status',
        'programId' => 'program_id',
        'trainerId' => 'trainer_id',
        'rpe' => 'rpe',
        'rpeNotes' => 'rpe_notes',
    ];

    $updates = [];
    $params = [];

    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }

    if (!empty($updates)) {
        $params[] = $id;
        $db->prepare("UPDATE sessions SET " . implode(', ', $updates) . " WHERE id = ?")
            ->execute($params);
    }

    if (!empty($input['status']) && $input['status'] === 'completed') {
        $userId = $auth['sub'];
        $db->prepare("INSERT INTO leaderboard_entries (user_id, points, workouts_completed, updated_at) 
            VALUES (?, 10, 1, NOW()) 
            ON DUPLICATE KEY UPDATE points = points + 10, workouts_completed = workouts_completed + 1, updated_at = NOW()")
            ->execute([$userId]);
        require_once __DIR__ . '/../gamification/achievements.php';
        checkAndUnlockAchievements();
        $sessionStmt = $db->prepare("SELECT title FROM sessions WHERE id = ?");
        $sessionStmt->execute([$id]);
        $session = $sessionStmt->fetch();
        require_once __DIR__ . '/../../helpers/activity.php';
        logActivity($auth['sub'], 'workout', 'Sesión completada: ' . ($session['title'] ?? 'Session'), 'Dumbbell', '#10b981', 'Done', 'bg-success');
    }

    success(null, 'Sesión actualizada');
}

function deleteSession(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM sessions WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Sesión no encontrada', 404);
    }

    $db->prepare("DELETE FROM sessions WHERE id = ?")->execute([$id]);
    success(null, 'Sesión eliminada');
}
