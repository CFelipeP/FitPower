<?php

function listPrograms(): void {
    $db = getDB();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $trainerId = $_GET['trainer_id'] ?? '';

    $where = "WHERE p.status = 'active'";
    $params = [];

    if ($trainerId) {
        $where .= " AND p.trainer_id = ?";
        $params[] = $trainerId;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM programs p $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    if ($total === 0) {
        $seed = [
            ['HIIT Inferno',       'High-intensity interval training to torch calories and boost cardiovascular endurance.',     'High Intensity', '35', 'intermediate', 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&h=450&fit=crop'],
            ['Total Strength',     'Full-body strength training focusing on compound lifts and progressive overload.',          'Strength',       '50', 'intermediate', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=450&fit=crop'],
            ['Upper Body Power',   'Targeted upper body program for chest, back, and arms.',                                     'Upper Body',     '45', 'intermediate', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=450&fit=crop'],
            ['Yoga Flow',          'Relaxing yoga flow for flexibility, mobility, and mental wellness.',                         'Mobility',       '40', 'beginner',    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=450&fit=crop'],
            ['Cardio Core Blast',  'Dynamic cardio and core program to build endurance and strengthen your midsection.',         'Cardio',         '30', 'beginner',    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=450&fit=crop'],
            ['Power & Plyo',       'Explosive plyometric training combined with powerlifting for athletic performance.',         'Plyometrics',    '45', 'advanced',   'https://images.unsplash.com/photo-1599058918144-1ffabb6ab9a0?w=600&h=450&fit=crop'],
            ['Bodyweight Mastery', 'Calisthenics program to build functional strength using only your body weight.',            'Calisthenics',   '35', 'intermediate', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=450&fit=crop'],
            ['Recovery & Stretch', 'Active recovery and stretching to improve mobility and reduce injury risk.',                'Recovery',       '25', 'beginner',    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=450&fit=crop'],
        ];
        $stmt = $db->prepare("INSERT INTO programs (name, description, tag, duration_minutes, difficulty, image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())");
        foreach ($seed as $s) {
            $stmt->execute([$s[0], $s[1], $s[2], $s[3], $s[4], $s[5]]);
        }
        $total = count($seed);
    }

    $stmt = $db->prepare("
        SELECT p.*, 
            CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM programs p
        LEFT JOIN trainers t ON t.id = p.trainer_id
        $where
        ORDER BY p.enrollments DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $programs = $stmt->fetchAll();

    // Owner flag so the UI can show Edit/Delete only for programs the
    // requesting user actually manages (coach → own trainer, admin → all).
    // listPrograms is public; tryAuth() returns null for anonymous visitors.
    $viewer = tryAuth();
    $isAdmin = ($viewer['role'] ?? '') === 'admin';
    $myTrainerId = null;
    if (($viewer['role'] ?? '') === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$viewer['sub']]);
        $myTrainerId = (int)$tStmt->fetchColumn() ?: null;
    }

    $programs = array_map(function($p) use ($isAdmin, $myTrainerId) {
        $trainerId = $p['trainer_id'] ? (int)$p['trainer_id'] : null;
        return [
            'id' => (int)$p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'tag' => $p['tag'],
            'durationMinutes' => $p['duration_minutes'],
            'difficulty' => $p['difficulty'],
            'image' => $p['image'],
            'enrollments' => (int)$p['enrollments'],
            'avgRating' => (float)$p['avg_rating'],
            'trainerName' => $p['trainer_name'],
            'trainerId' => $trainerId,
            'isOwner' => $isAdmin || ($myTrainerId !== null && $trainerId === $myTrainerId),
        ];
    }, $programs);

    success([
        'programs' => $programs,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function getProgram(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $role = $auth['role'] ?? 'client';

    $stmt = $db->prepare("
        SELECT p.*, CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM programs p
        LEFT JOIN trainers t ON t.id = p.trainer_id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $program = $stmt->fetch();

    if (!$program) {
        error('Program not found', 404);
    }

    // Users may only open Programs they are actively enrolled in.
    if ($role === 'client') {
        require_once __DIR__ . '/../../helpers/program_access.php';
        if (!userCanAccessProgram($db, (int)$auth['sub'], (int)$id)) {
            error('You do not have permission to access this program', 403);
        }
    }

    $sessionStmt = $db->prepare("
        SELECT id, title, description, date, start_time, end_time, type, status
        FROM sessions WHERE program_id = ? ORDER BY date, start_time
    ");
    $sessionStmt->execute([$id]);
    $sessions = $sessionStmt->fetchAll();

    $payload = [
        'id' => (int)$program['id'],
        'trainerId' => $program['trainer_id'] ? (int)$program['trainer_id'] : null,
        'trainerName' => $program['trainer_name'],
        'name' => $program['name'],
        'description' => $program['description'],
        'tag' => $program['tag'],
        'durationMinutes' => $program['duration_minutes'],
        'weeks' => (int)$program['weeks'],
        'sessionsPerWeek' => (int)$program['sessions_per_week'],
        'difficulty' => $program['difficulty'],
        'image' => $program['image'],
        'enrollments' => (int)$program['enrollments'],
        'status' => $program['status'],
        'sessions' => $sessions,
    ];

    // For enrolled clients the server derives real progress: completed workouts,
    // percentage, week/day for each workout and the next pending workout.
    if ($role === 'client') {
        require_once __DIR__ . '/../../helpers/program_progress.php';
        $workouts = loadProgramWorkouts($db, (int)$id);
        $spw = max(1, (int)$program['sessions_per_week']);
        $completion = loadProgramSessionCompletion($db, (int)$auth['sub'], (int)$id);

        $weekBySession = [];
        foreach ($workouts as $i => $w) {
            $weekBySession[(int)$w['id']] = intdiv($i, $spw) + 1;
        }

        $sessionPayloads = [];
        foreach ($sessions as $s) {
            $sId = (int)$s['id'];
            $done = !empty($completion[$sId]);
            $sessionPayloads[] = [
                'id' => $sId,
                'title' => $s['title'],
                'description' => $s['description'],
                'date' => $s['date'],
                'startTime' => $s['start_time'],
                'endTime' => $s['end_time'],
                'type' => $s['type'],
                'status' => $s['status'],
                'week' => $weekBySession[$sId] ?? null,
                'day' => (($i = array_search($sId, array_column($workouts, 'id'), true)) !== false) ? ($i % $spw) + 1 : null,
                'progressCompleted' => $done,
            ];
        }
        $payload['sessions'] = $sessionPayloads;

        $stats = recomputeProgramProgress($db, (int)$auth['sub'], (int)$id);
        $payload['progressPct'] = $stats['progress'];
        $payload['completedCount'] = $stats['completedCount'];
        $payload['totalSessions'] = $stats['totalSessions'];
        $payload['currentWeek'] = $stats['currentWeek'];
        $payload['nextWorkout'] = $stats['nextWorkout'];
    }

    success($payload);
}

function createProgram(): void {
    $auth = requireRole('admin', 'coach');
    $input = getJsonInput();

    $rules = [
        'name' => 'required|string|min:1|max:255',
        'description' => 'string|max:2000',
        'tag' => 'string|max:100',
        'durationMinutes' => 'numeric|min_value:1|max_value:999',
        'weeks' => 'numeric|min_value:1|max_value:52',
        'sessionsPerWeek' => 'numeric|min_value:1|max_value:7',
        'difficulty' => 'in:beginner,intermediate,advanced',
        'image' => 'string|max:500',
        'status' => 'in:active,inactive',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    // Coaches' programs are always attributed to their trainer profile so
    // they appear in their dashboard and are eligible for bulk assignment.
    $trainerId = $input['trainerId'] ?? null;
    if ($trainerId === null && ($auth['role'] ?? '') === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$auth['sub']]);
        $trainerId = $tStmt->fetchColumn() ?: null;
    }

    $stmt = $db->prepare("
        INSERT INTO programs (trainer_id, name, description, tag, duration_minutes, weeks, sessions_per_week, difficulty, image, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $trainerId,
        $input['name'],
        $input['description'] ?? null,
        $input['tag'] ?? null,
        $input['durationMinutes'] ?? null,
        $input['weeks'] ?? null,
        $input['sessionsPerWeek'] ?? null,
        $input['difficulty'] ?? null,
        $input['image'] ?? null,
        $input['status'] ?? 'active',
    ]);

    success([
        'id' => (int)$db->lastInsertId(),
        'name' => $input['name'],
    ], 'Program created', 201);
}

function updateProgram(string $id): void {
    $auth = requireRole('admin', 'coach');
    $db = getDB();

    $stmt = $db->prepare("SELECT id, trainer_id FROM programs WHERE id = ?");
    $stmt->execute([$id]);
    $program = $stmt->fetch();
    if (!$program) {
        error('Program not found', 404);
    }

    // Coaches may only edit programs they own (trainer profile matches).
    if ($auth['role'] === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$auth['sub']]);
        $trainerId = (int)$tStmt->fetchColumn();
        if (!$trainerId || (int)$program['trainer_id'] !== $trainerId) {
            error('You do not have permission to modify this program', 403);
        }
    }

    $input = getJsonInput();

    $validationRules = [];
    if (isset($input['name'])) $validationRules['name'] = 'string|min:1|max:255';
    if (isset($input['description'])) $validationRules['description'] = 'string|max:2000';
    if (isset($input['tag'])) $validationRules['tag'] = 'string|max:100';
    if (isset($input['durationMinutes'])) $validationRules['durationMinutes'] = 'numeric|min_value:1|max_value:999';
    if (isset($input['weeks'])) $validationRules['weeks'] = 'numeric|min_value:1|max_value:52';
    if (isset($input['sessionsPerWeek'])) $validationRules['sessionsPerWeek'] = 'numeric|min_value:1|max_value:7';
    if (isset($input['difficulty'])) $validationRules['difficulty'] = 'in:beginner,intermediate,advanced';
    if (isset($input['image'])) $validationRules['image'] = 'string|max:500';
    if (isset($input['status'])) $validationRules['status'] = 'in:active,inactive';

    if ($validationRules) {
        $errors = validate($input, $validationRules);
        if ($errors) {
            error('Validation error', 422, $errors);
        }
    }

    $fieldMap = [
        'name' => 'name',
        'description' => 'description',
        'tag' => 'tag',
        'durationMinutes' => 'duration_minutes',
        'weeks' => 'weeks',
        'sessionsPerWeek' => 'sessions_per_week',
        'difficulty' => 'difficulty',
        'image' => 'image',
        'status' => 'status',
        'enrollments' => 'enrollments',
    ];

    $updates = [];
    $params = [];

    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }

    if (empty($updates)) {
        error('No fields to update', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE programs SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    success(null, 'Program updated');
}

function deleteProgram(string $id): void {
    $auth = requireRole('admin', 'coach');
    $db = getDB();

    $stmt = $db->prepare("SELECT id, trainer_id FROM programs WHERE id = ?");
    $stmt->execute([$id]);
    $program = $stmt->fetch();
    if (!$program) {
        error('Program not found', 404);
    }

    // Coaches may only delete programs they own (trainer profile matches).
    if ($auth['role'] === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$auth['sub']]);
        $trainerId = (int)$tStmt->fetchColumn();
        if (!$trainerId || (int)$program['trainer_id'] !== $trainerId) {
            error('You do not have permission to delete this program', 403);
        }
    }

    $db->prepare("DELETE FROM programs WHERE id = ?")->execute([$id]);
    success(null, 'Program deleted');
}

function enrollUser(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $programId = $input['programId'] ?? $input['program_id'] ?? null;
    if (!$programId) error('programId is required', 422);

    $isAdminOrCoach = in_array($auth['role'] ?? '', ['admin', 'coach'], true);
    $userId = $isAdminOrCoach ? ($input['userId'] ?? null) : $auth['sub'];

    if (!$userId) error('userId is required', 422);

    if ($isAdminOrCoach && !$input['userId']) error('userId is required for admin/coach', 422);

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
    $stmt->execute([$userId, $programId]);
    if ($stmt->fetch()) {
        error('The user is already enrolled in this program', 409);
    }

    $db->prepare("INSERT INTO user_programs (user_id, program_id, status) VALUES (?, ?, 'active')")
        ->execute([$userId, $programId]);

    $db->prepare("UPDATE programs SET enrollments = enrollments + 1 WHERE id = ?")
        ->execute([$programId]);

    // Tell the client they were enrolled (self-enroll or coach assignment).
    try {
        $progStmt = $db->prepare("SELECT name FROM programs WHERE id = ?");
        $progStmt->execute([$programId]);
        $progName = (string)$progStmt->fetchColumn();
        $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, icon_color, link, created_at)
            VALUES (?, 'program', 'Program assigned', ?, 'Dumbbell', '#10b981', '/client/dashboard', NOW())")
            ->execute([$userId, 'You are now enrolled in "' . $progName . '". Start today from your dashboard!']);
    } catch (\PDOException $e) {
        error_log('enrollUser notification failed: ' . $e->getMessage());
    }

    success(null, 'Enrollment successful', 201);
}

function bulkEnrollProgram(string $id): void {
    $auth = requireRole('admin', 'coach');
    $input = getJsonInput();
    $programId = (int)$id;
    $userIds = $input['userIds'] ?? [];
    if (!is_array($userIds) || empty($userIds)) error('userIds is required', 422);
    if (count($userIds) > 100) error('Maximum 100 users per batch', 422);

    $db = getDB();

    $progStmt = $db->prepare("SELECT id, name, trainer_id FROM programs WHERE id = ?");
    $progStmt->execute([$programId]);
    $program = $progStmt->fetch();
    if (!$program) error('Program not found', 404);

    // Coaches may only bulk-assign their own programs.
    if ($auth['role'] === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$auth['sub']]);
        $trainerId = (int)$tStmt->fetchColumn();
        if (!$trainerId || (int)$program['trainer_id'] !== $trainerId) {
            error('You do not have permission to access this program', 403);
        }
    }

    $enrolled = 0;
    $skipped = 0;
    $db->beginTransaction();
    try {
        foreach (array_map('intval', $userIds) as $userId) {
            if ($userId <= 0) { $skipped++; continue; }
            $chk = $db->prepare("SELECT id FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
            $chk->execute([$userId, $programId]);
            if ($chk->fetch()) { $skipped++; continue; }
            $db->prepare("INSERT INTO user_programs (user_id, program_id, status) VALUES (?, ?, 'active')")
                ->execute([$userId, $programId]);
            $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, icon_color, link, created_at)
                VALUES (?, 'program', 'Program assigned', ?, 'Dumbbell', '#10b981', '/client/dashboard', NOW())")
                ->execute([$userId, 'Your coach assigned you the program "' . $program['name'] . '".']);
            $enrolled++;
        }
        if ($enrolled > 0) {
            $db->prepare("UPDATE programs SET enrollments = enrollments + ? WHERE id = ?")
                ->execute([$enrolled, $programId]);
        }
        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        error_log('bulkEnrollProgram failed: ' . $e->getMessage());
        error('Could not complete the assignment', 500);
    }

    success(['enrolled' => $enrolled, 'skipped' => $skipped], "$enrolled clients enrolled" . ($skipped ? ", $skipped skipped (already enrolled or invalid)" : ''), 201);
}

function cloneProgram(string $id): void {
    $auth = requireRole('admin', 'coach');
    $input = getJsonInput();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM programs WHERE id = ?");
    $stmt->execute([(int)$id]);
    $original = $stmt->fetch();
    if (!$original) error('Program not found', 404);

    $trainerId = isset($input['trainer_id']) ? (int)$input['trainer_id'] : $original['trainer_id'];

    $db->prepare("INSERT INTO programs (trainer_id, name, description, tag, duration_minutes, weeks, sessions_per_week, difficulty, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW(), NOW())")->execute([
        $trainerId,
        $original['name'] . ' (Copy)',
        $original['description'],
        $original['tag'],
        $original['duration_minutes'],
        $original['weeks'],
        $original['sessions_per_week'],
        $original['difficulty'],
    ]);

    $newId = (int)$db->lastInsertId();
    success(['id' => $newId], 'Program cloned successfully', 201);
}

function unenrollUser(string $id): void {
    $auth = requireRole('admin', 'coach');
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_programs WHERE id = ?");
    $stmt->execute([$id]);
    $enrollment = $stmt->fetch();

    if (!$enrollment) {
        error('Enrollment not found', 404);
    }

    $db->prepare("UPDATE user_programs SET status = 'cancelled' WHERE id = ?")->execute([$id]);
    $db->prepare("UPDATE programs SET enrollments = GREATEST(enrollments - 1, 0) WHERE id = ?")
        ->execute([$enrollment['program_id']]);

    success(null, 'Enrollment cancelled');
}

function selfEnroll(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id, status FROM programs WHERE id = ?");
    $stmt->execute([(int)$id]);
    $program = $stmt->fetch();
    if (!$program) error('Program not found', 404);
    if ($program['status'] !== 'active') error('The program is not available', 400);
    $chk = $db->prepare("SELECT id FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
    $chk->execute([$auth['sub'], (int)$id]);
    if ($chk->fetch()) error('You are already enrolled in this program', 409);
    $db->prepare("INSERT INTO user_programs (user_id, program_id, status) VALUES (?, ?, 'active')")
        ->execute([$auth['sub'], (int)$id]);
    $db->prepare("UPDATE programs SET enrollments = enrollments + 1 WHERE id = ?")
        ->execute([(int)$id]);
    success(null, 'Enrollment successful', 201);
}

/**
 * My Programs — the Programs the current user is actively enrolled in.
 * Users never see the global catalog here; only what they can actually use.
 */
function listUserEnrollments(): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        SELECT p.id, p.name, p.description, p.tag, p.difficulty, p.image,
               p.weeks, p.sessions_per_week, p.duration_minutes, p.enrollments,
               up.progress, up.current_week, up.status AS enrollment_status, up.started_at,
               CONCAT(t.first_name, ' ', t.last_name) AS trainer_name
        FROM user_programs up
        JOIN programs p ON p.id = up.program_id
        LEFT JOIN trainers t ON t.id = p.trainer_id
        WHERE up.user_id = ? AND up.status = 'active'
        ORDER BY up.started_at DESC
    ");
    $stmt->execute([$auth['sub']]);

    $enrollments = array_map(function($p) {
        return [
            'id' => (int)$p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'tag' => $p['tag'],
            'difficulty' => $p['difficulty'],
            'image' => $p['image'],
            'weeks' => (int)($p['weeks'] ?? 0),
            'sessionsPerWeek' => (int)($p['sessions_per_week'] ?? 0),
            'durationMinutes' => (int)($p['duration_minutes'] ?? 0),
            'enrollments' => (int)$p['enrollments'],
            'progress' => (float)($p['progress'] ?? 0),
            'currentWeek' => (int)($p['current_week'] ?? 1),
            'startedAt' => $p['started_at'],
            'trainerName' => $p['trainer_name'],
        ];
    }, $stmt->fetchAll());

    success($enrollments);
}
