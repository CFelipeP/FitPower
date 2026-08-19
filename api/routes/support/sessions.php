<?php

const SESSION_TYPES = ['group', '1on1', 'video', 'strength', 'hypertrophy', 'cardio', 'hiit', 'flexibility'];

function fetchSessionOr404(PDO $db, string $id): array {
    $stmt = $db->prepare("
        SELECT s.*,
            CONCAT(t.first_name, ' ', t.last_name) as trainer_name,
            p.name as program_name
        FROM sessions s
        LEFT JOIN trainers t ON t.id = s.trainer_id
        LEFT JOIN programs p ON p.id = s.program_id
        WHERE s.id = ?
    ");
    $stmt->execute([$id]);
    $session = $stmt->fetch();
    if (!$session) {
        error('Session not found', 404);
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
    if ($stmt->fetchColumn()) return true;

    // A client may also access sessions (workouts) that belong to a Program
    // they are actively enrolled in.
    if (!empty($session['program_id'])) {
        $upStmt = $db->prepare("SELECT 1 FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
        $upStmt->execute([(int)$auth['sub'], (int)$session['program_id']]);
        return (bool)$upStmt->fetchColumn();
    }

    return false;
}

function assertSessionAccess(array $auth, PDO $db, array $session): void {
    if (!canAccessSession($auth, $db, $session)) {
        error('You do not have permission to access this session', 403);
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
        SELECT e.*, el.video_url, el.image_url, el.muscle_group, el.equipment,
               el.instructions, el.external_id, el.source AS exercise_source
        FROM exercises e
        LEFT JOIN exercise_library el ON el.id = e.exercise_id
        WHERE e.session_id IN ($placeholders)
        ORDER BY e.sort_order, e.id
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
            'exerciseId' => $ex['exercise_id'] !== null ? (int)$ex['exercise_id'] : null,
            'videoUrl' => $ex['video_url'],
            'imageUrl' => $ex['image_url'],
            'muscleGroup' => $ex['muscle_group'],
            'equipment' => $ex['equipment'],
            'instructions' => $ex['instructions'],
            'externalId' => $ex['external_id'],
            'source' => $ex['exercise_source'],
        ];
    }
    return $bySession;
}

/** Loads guided-workout progress (session_id => decoded object) for a user. */
function loadSessionProgress(PDO $db, array $sessionIds, int $userId): array {
    if (empty($sessionIds)) return [];
    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
    $params = array_merge($sessionIds, [$userId]);
    $stmt = $db->prepare("
        SELECT session_id, progress, completed FROM session_progress
        WHERE session_id IN ($placeholders) AND user_id = ?
    ");
    $stmt->execute($params);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $out[(int)$row['session_id']] = [
            'progress' => $row['progress'] ? json_decode($row['progress'], true) : null,
            'completed' => (bool)$row['completed'],
        ];
    }
    return $out;
}

/**
 * Saves the guided-workout progress snapshot for a session.
 * QA-audit fix: GuidedWorkout called PUT /sessions/{id}/progress which did not exist.
 */
function saveSessionProgress(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();

    $session = fetchSessionOr404($db, $id);
    assertSessionAccess($auth, $db, $session);

    $progress = $input['progress'] ?? null;
    if ($progress !== null && !is_array($progress)) {
        error('progress must be an object', 422);
    }
    $completed = !empty($input['completed']) ? 1 : 0;

    $stmt = $db->prepare("
        INSERT INTO session_progress (session_id, user_id, progress, completed)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE progress = VALUES(progress), completed = VALUES(completed), updated_at = NOW()
    ");
    $stmt->execute([(int)$id, $auth['sub'], $progress !== null ? json_encode($progress) : null, $completed]);

    // Persist real start/completion timestamps on the session itself and keep
    // program progress in sync. Both are idempotent.
    if ($completed) {
        $db->prepare("UPDATE sessions SET status = 'completed', completed_at = COALESCE(completed_at, NOW()) WHERE id = ? AND status <> 'completed'")
            ->execute([(int)$id]);
    } else {
        $db->prepare("UPDATE sessions SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE id = ? AND status = 'scheduled'")
            ->execute([(int)$id]);
    }

    if ($completed && !empty($session['program_id'])) {
        require_once __DIR__ . '/../../helpers/program_progress.php';
        recomputeProgramProgress($db, (int)$auth['sub'], (int)$session['program_id']);
    }

    success(['saved' => true, 'completed' => (bool)$completed]);
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
    $progressBySession = loadSessionProgress($db, $sessionIds, (int)$auth['sub']);

    $result = array_map(function ($s) use ($exercisesBySession, $progressBySession) {
        $mapped = mapSession($s);
        $mapped['exercises'] = $exercisesBySession[(int)$s['id']] ?? [];
        $mapped['progress'] = $progressBySession[(int)$s['id']]['progress'] ?? null;
        $mapped['progressCompleted'] = $progressBySession[(int)$s['id']]['completed'] ?? false;
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
        '(s.user_id = ? OR EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = s.id AND sp.user_id = ?)
          OR EXISTS (SELECT 1 FROM user_programs up WHERE up.user_id = ? AND up.status = \'active\' AND up.program_id = s.program_id))',
        [$auth['sub'], $auth['sub'], $auth['sub']],
    ];
}

function createSession(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $role = $auth['role'] ?? 'client';

    // Users do not compose workouts; only coaches/admins may attach exercises
    // when creating a session.
    if ($role === 'client' && !empty($input['exercises']) && is_array($input['exercises'])) {
        error('You do not have permission to add exercises', 403);
    }

    $rules = [
        'title' => 'required|string|min:1|max:255',
        'date' => 'required|date',
        'description' => 'string|max:2000',
        'startTime' => 'time',
        'endTime' => 'time',
        'type' => 'in:group,1on1,video,strength,hypertrophy,cardio,hiit,flexibility',
        'status' => 'in:scheduled,completed,cancelled',
        'rpe' => 'numeric|min_value:1|max_value:10',
        'rpeNotes' => 'string|max:1000',
        'trainerId' => 'numeric|min_value:1',
        'programId' => 'numeric|min_value:1',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    $userId = null;
    $trainerId = null;
    $bookedTrainerId = $input['trainerId'] ?? null;

    if ($role === 'client') {
        $userId = (int)$auth['sub'];
        // A client may book with a specific coach (from the coach profile or
        // availability widget). Validate the trainer exists and keep the link
        // so the coach actually sees the booking in their schedule.
        if ($bookedTrainerId !== null && $bookedTrainerId !== '') {
            $tStmt = $db->prepare("SELECT t.id, t.user_id, t.status FROM trainers t WHERE t.id = ?");
            $tStmt->execute([(int)$bookedTrainerId]);
            $trainerRow = $tStmt->fetch();
            if (!$trainerRow) {
                error('Coach not found', 404);
            }
            if ($trainerRow['status'] !== 'approved') {
                error('This coach is not accepting bookings at this time', 400);
            }
            $trainerId = (int)$trainerRow['id'];
        }
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

    // Notify the coach when a client books a session with them.
    if ($role === 'client' && $trainerId !== null) {
        try {
            $notifStmt = $db->prepare("
                SELECT user_id FROM trainers WHERE id = ?
            ");
            $notifStmt->execute([$trainerId]);
            $coachUserId = (int)$notifStmt->fetchColumn();
            if ($coachUserId > 0) {
                $userNameStmt = $db->prepare("SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = ?");
                $userNameStmt->execute([$userId]);
                $clientName = (string)$userNameStmt->fetchColumn();
                $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, icon_color, link, created_at)
                    VALUES (?, 'session', 'New session booked', ?, 'CalendarDays', '#f97316', ?, NOW())")
                    ->execute([
                        $coachUserId,
                        $clientName . ' booked "' . ($input['title'] ?? 'Session') . '" on ' . $input['date'],
                        '/coach/dashboard',
                    ]);
            }
        } catch (\PDOException $e) {
            // Notification is best-effort; never fail the booking because of it.
            error_log('createSession booking notification failed: ' . $e->getMessage());
        }
    }

    if (!empty($input['exercises'])) {
        if (!is_array($input['exercises'])) {
            error('exercises must be an array', 422);
        }
        $exStmt = $db->prepare("
            INSERT INTO exercises (session_id, name, sets, reps, weight, notes, sort_order, exercise_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($input['exercises'] as $i => $ex) {
            if (!is_array($ex)) continue;
            $name = isset($ex['name']) ? trim((string)$ex['name']) : '';
            if ($name === '' || mbStrlenCompat($name) > 255) continue;
            $sets = isset($ex['sets']) && $ex['sets'] !== '' && is_numeric($ex['sets']) ? min(255, max(0, (int)$ex['sets'])) : null;
            $reps = isset($ex['reps']) && $ex['reps'] !== '' ? mb_substr((string)$ex['reps'], 0, 50) : null;
            $weight = isset($ex['weight']) && $ex['weight'] !== '' ? mb_substr((string)$ex['weight'], 0, 50) : null;
            $notes = isset($ex['notes']) && $ex['notes'] !== '' ? mb_substr((string)$ex['notes'], 0, 1000) : null;
            $exerciseId = isset($ex['exerciseId']) && is_numeric($ex['exerciseId']) ? (int)$ex['exerciseId'] : null;
            $exStmt->execute([
                $sessionId,
                $name,
                $sets,
                $reps,
                $weight,
                $notes,
                $i + 1,
                $exerciseId,
            ]);
        }
    }

    // Return the complete session so clients can render it immediately
    // without a refetch.
    $created = fetchSessionOr404($db, (string)$sessionId);
    $mapped = mapSession($created);
    $bySession = loadExercises($db, [$sessionId]);
    $mapped['exercises'] = $bySession[$sessionId] ?? [];
    $prog = loadSessionProgress($db, [(int)$sessionId], (int)$auth['sub']);
    $mapped['progress'] = $prog[(int)$sessionId]['progress'] ?? null;
    $mapped['progressCompleted'] = $prog[(int)$sessionId]['completed'] ?? false;

    success($mapped, 'Session created', 201);
}

function updateSession(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $db = getDB();

    $session = fetchSessionOr404($db, $id);
    assertSessionAccess($auth, $db, $session);

    $validationRules = [];
    if (isset($input['title'])) $validationRules['title'] = 'string|min:1|max:255';
    if (isset($input['date'])) $validationRules['date'] = 'date';
    if (isset($input['description'])) $validationRules['description'] = 'string|max:2000';
    if (isset($input['startTime'])) $validationRules['startTime'] = 'time';
    if (isset($input['endTime'])) $validationRules['endTime'] = 'time';
    if (isset($input['type'])) $validationRules['type'] = 'in:group,1on1,video,strength,hypertrophy,cardio,hiit,flexibility';
    if (isset($input['status'])) $validationRules['status'] = 'in:scheduled,completed,cancelled';
    if (isset($input['rpe'])) $validationRules['rpe'] = 'numeric|min_value:1|max_value:10';
    if (isset($input['rpeNotes'])) $validationRules['rpeNotes'] = 'string|max:1000';
    if (isset($input['programId'])) $validationRules['programId'] = 'numeric|min_value:1';
    if (isset($input['trainerId'])) $validationRules['trainerId'] = 'numeric|min_value:1';

    if ($validationRules) {
        $errors = validate($input, $validationRules);
        if ($errors) {
            error('Validation error', 422, $errors);
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

    // Persist the real completion timestamp (idempotent) and refresh the user's
    // program progress whenever a program workout is completed. session_progress
    // is the single source of truth for per-user completion, so the status path
    // converges with the guided-workout progress path.
    if (!empty($input['status']) && $input['status'] === 'completed') {
        $db->prepare("UPDATE sessions SET completed_at = COALESCE(completed_at, NOW()) WHERE id = ?")
            ->execute([$id]);
        $db->prepare("
            INSERT INTO session_progress (session_id, user_id, progress, completed, updated_at)
            VALUES (?, ?, NULL, 1, NOW())
            ON DUPLICATE KEY UPDATE completed = 1, updated_at = NOW()
        ")->execute([(int)$id, (int)$auth['sub']]);
        if (!empty($session['program_id'])) {
            require_once __DIR__ . '/../../helpers/program_progress.php';
            recomputeProgramProgress($db, (int)$auth['sub'], (int)$session['program_id']);
        }
    }

    if (!empty($input['status']) && $input['status'] === 'completed') {
        $userId = $auth['sub'];
        $db->prepare("INSERT INTO leaderboard_entries (user_id, total_points, workouts_completed, updated_at) 
            VALUES (?, 10, 1, NOW()) 
            ON DUPLICATE KEY UPDATE total_points = total_points + 10, workouts_completed = workouts_completed + 1, updated_at = NOW()")
            ->execute([$userId]);
        // Mark the user's participation as completed so coach dashboards and
        // weekly volume reflect the workout.
        try {
            $db->prepare("UPDATE session_participants SET status = 'completed' WHERE session_id = ? AND user_id = ? AND status = 'registered'")
                ->execute([(int)$id, $userId]);
        } catch (\PDOException $e) {
            error_log('updateSession participant completion failed: ' . $e->getMessage());
        }
        require_once __DIR__ . '/../gamification/achievements.php';
        checkAndUnlockAchievements();
        require_once __DIR__ . '/../../helpers/activity.php';
        logActivity($auth['sub'], 'workout', 'Session completed: ' . ($session['title'] ?? 'Session'), 'Dumbbell', '#10b981', 'Done', 'bg-success');
    }

    // Return the updated session so clients can reflect changes immediately.
    $fresh = fetchSessionOr404($db, $id);
    $mapped = mapSession($fresh);
    $bySession = loadExercises($db, [(int)$id]);
    $mapped['exercises'] = $bySession[(int)$id] ?? [];

    success($mapped, 'Session updated');
}

function deleteSession(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $session = fetchSessionOr404($db, $id);
    assertSessionAccess($auth, $db, $session);

    $db->prepare("DELETE FROM sessions WHERE id = ?")->execute([$id]);
    success(null, 'Session deleted');
}

function addSessionExercise(string $sessionId): void {
    // Users do not compose workouts: only coaches/admins add exercises to a
    // session. A user executes the exercises the coach already configured.
    $auth = requireRole('admin', 'coach');
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
        'exerciseId' => 'numeric|min_value:1',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $sortStmt = $db->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exercises WHERE session_id = ?");
    $sortStmt->execute([$sessionId]);
    $sortOrder = (int)$sortStmt->fetchColumn();

    $stmt = $db->prepare("
        INSERT INTO exercises (session_id, name, sets, reps, weight, notes, sort_order, exercise_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $sessionId,
        $input['name'],
        isset($input['sets']) && $input['sets'] !== '' ? (int)$input['sets'] : null,
        $input['reps'] ?? null,
        $input['weight'] ?? null,
        $input['notes'] ?? null,
        $sortOrder,
        isset($input['exerciseId']) && $input['exerciseId'] !== '' ? (int)$input['exerciseId'] : null,
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
        'exerciseId' => isset($input['exerciseId']) && $input['exerciseId'] !== '' ? (int)$input['exerciseId'] : null,
    ], 'Exercise added', 201);
}

function deleteSessionExercise(string $sessionId, string $exerciseId): void {
    $auth = requireAuth();
    $db = getDB();

    $session = fetchSessionOr404($db, $sessionId);
    assertSessionAccess($auth, $db, $session);

    $stmt = $db->prepare("SELECT id FROM exercises WHERE id = ? AND session_id = ?");
    $stmt->execute([$exerciseId, $sessionId]);
    if (!$stmt->fetch()) {
        error('Exercise not found', 404);
    }

    $db->prepare("DELETE FROM exercises WHERE id = ? AND session_id = ?")->execute([$exerciseId, $sessionId]);
    success(null, 'Exercise deleted');
}

/**
 * Reorders the exercises of a workout. Coach/admin only; the order array must
 * contain the exact ids of the session's exercise rows (validated) so the
 * user sees exactly the order the coach defined.
 */
function reorderSessionExercises(string $sessionId): void {
    $auth = requireRole('admin', 'coach');
    $input = getJsonInput();
    $db = getDB();

    $session = fetchSessionOr404($db, $sessionId);
    assertSessionAccess($auth, $db, $session);

    $order = $input['order'] ?? null;
    if (!is_array($order) || empty($order)) {
        error('order must be a non-empty array', 422);
    }

    $placeholders = implode(',', array_fill(0, count($order), '?'));
    $params = array_merge($order, [$sessionId]);
    $stmt = $db->prepare("SELECT id FROM exercises WHERE id IN ($placeholders) AND session_id = ?");
    $stmt->execute($params);
    $found = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

    $unique = array_values(array_unique(array_map('intval', $order)));
    if (count($found) !== count($unique)) {
        error('Order must contain exactly the session exercises', 422);
    }

    $update = $db->prepare("UPDATE exercises SET sort_order = ? WHERE id = ? AND session_id = ?");
    foreach ($unique as $i => $exId) {
        $update->execute([$i + 1, $exId, $sessionId]);
    }

    $bySession = loadExercises($db, [(int)$sessionId]);
    success(['exercises' => $bySession[(int)$sessionId] ?? []], 'Exercise order saved');
}
