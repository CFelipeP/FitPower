<?php

const SESSION_TYPES = ['group', '1on1', 'video', 'strength', 'hypertrophy', 'cardio', 'hiit', 'flexibility'];

function fetchSessionOr404(PDO $db, string $id): array {
    $stmt = $db->prepare("SELECT s.* FROM sessions s WHERE s.id = ?");
    $stmt->execute([$id]);
    $session = $stmt->fetch();
    if (!$session) {
        error('Sesión no encontrada', 404);
    }
    return $session;
}

function canAccessSession(array $auth, PDO $db, array $session): bool {
    $role = $auth['role'] ?? 'client';
    if ($role === 'admin') return true;

    if ($role === 'coach') {
        $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $stmt->execute([$auth['sub']]);
        $trainerId = $stmt->fetchColumn();
        return $trainerId !== false && (int)$session['trainer_id'] === (int)$trainerId;
    }

    if ((int)$session['user_id'] === (int)$auth['sub']) return true;

    $stmt = $db->prepare("SELECT 1 FROM session_participants WHERE session_id = ? AND user_id = ?");
    $stmt->execute([(int)$session['id'], $auth['sub']]);
    return (bool)$stmt->fetchColumn();
}

function assertSessionAccess(array $auth, PDO $db, array $session): void {
    if (!canAccessSession($auth, $db, $session)) {
        error('No tienes permisos para acceder a esta sesión', 403);
    }
}

function mapSession(array $s): array {
    return [
        'id' => (int)$s['id'],
        'userId' => $s['user_id'] ? (int)$s['user_id'] : null,
        'programId' => $s['program_id'] ? (int)$s['program_id'] : null,
        'trainerId' => $s['trainer_id'] ? (int)$s['trainer_id'] : null,
        'trainerName' => $s['trainer_name'],
        'trainer' => $s['trainer_name'],
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
        'rpe_notes' => $s['rpe_notes'],
        'exercises' => [],
    ];
}

function loadExercises(PDO $db, array $sessionIds): array {
    if (empty($sessionIds)) return [];
    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
    $stmt = $db->prepare("
        SELECT * FROM exercises
        WHERE session_id IN ($placeholders)
        ORDER BY sort_order, id
    ");
    $stmt->execute($sessionIds);
    $bySession = [];
    foreach ($stmt->fetchAll() as $ex) {
        $bySession[(int)$ex['session_id']][] = [
            'id' => (int)$ex['id'],
            'sessionId' => (int)$ex['session_id'],
            'name' => $ex['name'],
            'sets' => $ex['sets'] !== null ? (int)$ex['sets'] : null,
            'reps' => $ex['reps'],
            'weight' => $ex['weight'],
            'notes' => $ex['notes'],
            'sortOrder' => (int)$ex['sort_order'],
        ];
    }
    return $bySession;
}

function listSessions(): void {
    $auth = requireAuth();
    $db = getDB();

    $programId = $_GET['program_id'] ?? '';
    $trainerId = $_GET['trainer_id'] ?? '';
    $date = $_GET['date'] ?? '';

    [$accessSql, $accessParams] = sessionAccessFilter($auth, $db);

    $where = [];
    $params = [];

    if ($accessSql !== '') {
        $where[] = $accessSql;
        $params = array_merge($params, $accessParams);
    }
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

    $sessionIds = array_map(function ($s) { return (int)$s['id']; }, $sessions);
    $exercisesBySession = loadExercises($db, $sessionIds);

    $result = array_map(function ($s) use ($exercisesBySession) {
        $mapped = mapSession($s);
        $mapped['exercises'] = $exercisesBySession[(int)$s['id']] ?? [];
        return $mapped;
    }, $sessions);

    success($result);
}

function sessionAccessFilter(array $auth, PDO $db): array {
    $role = $auth['role'] ?? 'client';
    if ($role === 'admin') return ['', []];

    if ($role === 'coach') {
        $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $stmt->execute([$auth['sub']]);
        $trainerId = $stmt->fetchColumn();
        if (!$trainerId) return ['1 = 0', []];
        return ['s.trainer_id = ?', [(int)$trainerId]];
    }

    return [
        '(s.user_id = ? OR EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = s.id AND sp.user_id = ?))',
        [$auth['sub'], $auth['sub']],
    ];
}

function createSession(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $role = $auth['role'] ?? 'client';

    $rules = [
        'title' => 'required|string|min:1|max:255',
        'date' => 'required|string',
        'description' => 'string|max:2000',
        'startTime' => 'string|max:10',
        'endTime' => 'string|max:10',
        'type' => 'in:group,1on1,video,strength,hypertrophy,cardio,hiit,flexibility',
        'status' => 'in:scheduled,completed,cancelled',
        'rpe' => 'numeric|min_value:1|max_value:10',
        'rpeNotes' => 'string|max:1000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $userId = null;
    $trainerId = $input['trainerId'] ?? null;

    if ($role === 'client') {
        $userId = (int)$auth['sub'];
        $trainerId = null;
    } elseif ($role === 'coach') {
        $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $stmt->execute([$auth['sub']]);
        $coachTrainerId = $stmt->fetchColumn();
        $trainerId = $coachTrainerId ?: null;
    }

    $stmt = $db->prepare("
        INSERT INTO sessions (user_id, program_id, trainer_id, title, description, date, start_time, end_time, type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $userId,
        $input['programId'] ?? null,
        $trainerId,
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

    $session = fetchSessionOr404($db, $id);
    assertSessionAccess($auth, $db, $session);

    $validationRules = [];
    if (isset($input['title'])) $validationRules['title'] = 'string|min:1|max:255';
    if (isset($input['date'])) $validationRules['date'] = 'string';
    if (isset($input['description'])) $validationRules['description'] = 'string|max:2000';
    if (isset($input['startTime'])) $validationRules['startTime'] = 'string|max:10';
    if (isset($input['endTime'])) $validationRules['endTime'] = 'string|max:10';
    if (isset($input['type'])) $validationRules['type'] = 'in:group,1on1,video,strength,hypertrophy,cardio,hiit,flexibility';
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
        $db->prepare("INSERT INTO leaderboard_entries (user_id, total_points, workouts_completed, updated_at) 
            VALUES (?, 10, 1, NOW()) 
            ON DUPLICATE KEY UPDATE total_points = total_points + 10, workouts_completed = workouts_completed + 1, updated_at = NOW()")
            ->execute([$userId]);
        require_once __DIR__ . '/../gamification/achievements.php';
        checkAndUnlockAchievements();
        require_once __DIR__ . '/../../helpers/activity.php';
        logActivity($auth['sub'], 'workout', 'Sesión completada: ' . ($session['title'] ?? 'Session'), 'Dumbbell', '#10b981', 'Done', 'bg-success');
    }

    success(null, 'Sesión actualizada');
}

function deleteSession(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $session = fetchSessionOr404($db, $id);
    assertSessionAccess($auth, $db, $session);

    $db->prepare("DELETE FROM sessions WHERE id = ?")->execute([$id]);
    success(null, 'Sesión eliminada');
}

function addSessionExercise(string $sessionId): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();

    $session = fetchSessionOr404($db, $sessionId);
    assertSessionAccess($auth, $db, $session);

    $rules = [
        'name' => 'required|string|min:1|max:255',
        'sets' => 'numeric|min_value:1|max_value:255',
        'reps' => 'string|max:50',
        'weight' => 'string|max:50',
        'notes' => 'string|max:1000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $sortStmt = $db->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exercises WHERE session_id = ?");
    $sortStmt->execute([$sessionId]);
    $sortOrder = (int)$sortStmt->fetchColumn();

    $stmt = $db->prepare("
        INSERT INTO exercises (session_id, name, sets, reps, weight, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $sessionId,
        $input['name'],
        isset($input['sets']) && $input['sets'] !== '' ? (int)$input['sets'] : null,
        $input['reps'] ?? null,
        $input['weight'] ?? null,
        $input['notes'] ?? null,
        $sortOrder,
    ]);

    $exerciseId = (int)$db->lastInsertId();
    success([
        'id' => $exerciseId,
        'sessionId' => (int)$sessionId,
        'name' => $input['name'],
        'sets' => isset($input['sets']) && $input['sets'] !== '' ? (int)$input['sets'] : null,
        'reps' => $input['reps'] ?? null,
        'weight' => $input['weight'] ?? null,
        'notes' => $input['notes'] ?? null,
        'sortOrder' => $sortOrder,
    ], 'Ejercicio agregado', 201);
}

function deleteSessionExercise(string $sessionId, string $exerciseId): void {
    $auth = requireAuth();
    $db = getDB();

    $session = fetchSessionOr404($db, $sessionId);
    assertSessionAccess($auth, $db, $session);

    $stmt = $db->prepare("SELECT id FROM exercises WHERE id = ? AND session_id = ?");
    $stmt->execute([$exerciseId, $sessionId]);
    if (!$stmt->fetch()) {
        error('Ejercicio no encontrado', 404);
    }

    $db->prepare("DELETE FROM exercises WHERE id = ? AND session_id = ?")->execute([$exerciseId, $sessionId]);
    success(null, 'Ejercicio eliminado');
}
