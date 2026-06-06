<?php

function listPrograms(): void {
    $auth = requireAuth();
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

    $programs = array_map(function($p) {
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

    $stmt = $db->prepare("
        SELECT p.*, CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM programs p
        LEFT JOIN trainers t ON t.id = p.trainer_id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $program = $stmt->fetch();

    if (!$program) {
        error('Programa no encontrado', 404);
    }

    $sessionStmt = $db->prepare("
        SELECT id, title, description, date, start_time, end_time, type, status
        FROM sessions WHERE program_id = ? ORDER BY date, start_time
    ");
    $sessionStmt->execute([$id]);
    $sessions = $sessionStmt->fetchAll();

    success([
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
    ]);
}

function createProgram(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'name' => 'required|string|min:1|max:255',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("
        INSERT INTO programs (trainer_id, name, description, tag, duration_minutes, weeks, sessions_per_week, difficulty, image, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $input['trainerId'] ?? null,
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
    ], 'Programa creado', 201);
}

function updateProgram(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM programs WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Programa no encontrado', 404);
    }

    $input = getJsonInput();

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
        error('No hay campos para actualizar', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE programs SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    success(null, 'Programa actualizado');
}

function deleteProgram(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM programs WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Programa no encontrado', 404);
    }

    $db->prepare("DELETE FROM programs WHERE id = ?")->execute([$id]);
    success(null, 'Programa eliminado');
}

function enrollUser(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'userId' => 'required',
        'programId' => 'required',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
    $stmt->execute([$input['userId'], $input['programId']]);
    if ($stmt->fetch()) {
        error('El usuario ya está inscrito en este programa', 409);
    }

    $db->prepare("INSERT INTO user_programs (user_id, program_id, status) VALUES (?, ?, 'active')")
        ->execute([$input['userId'], $input['programId']]);

    $db->prepare("UPDATE programs SET enrollments = enrollments + 1 WHERE id = ?")
        ->execute([$input['programId']]);

    success(null, 'Inscripción exitosa', 201);
}

function unenrollUser(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_programs WHERE id = ?");
    $stmt->execute([$id]);
    $enrollment = $stmt->fetch();

    if (!$enrollment) {
        error('Inscripción no encontrada', 404);
    }

    $db->prepare("UPDATE user_programs SET status = 'cancelled' WHERE id = ?")->execute([$id]);
    $db->prepare("UPDATE programs SET enrollments = GREATEST(enrollments - 1, 0) WHERE id = ?")
        ->execute([$enrollment['program_id']]);

    success(null, 'Inscripción cancelada');
}
