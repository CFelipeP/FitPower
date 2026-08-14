<?php

function listTrainers(): void {
    $auth = requireAuth();
    $db = getDB();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $search = $_GET['search'] ?? '';
    $status = $_GET['status'] ?? '';

    $where = [];
    $params = [];

    if ($search) {
        $where[] = "(t.first_name LIKE ? OR t.last_name LIKE ? OR t.email LIKE ?)";
        $s = "%$search%";
        $params[] = $s; $params[] = $s; $params[] = $s;
    }

    if ($status) {
        $where[] = "t.status = ?";
        $params[] = $status;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM trainers t $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT t.*, 
            GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') as specializations_list,
            GROUP_CONCAT(DISTINCT l.name SEPARATOR ', ') as languages_list
        FROM trainers t
        LEFT JOIN trainer_specialization ts ON ts.trainer_id = t.id
        LEFT JOIN specializations s ON s.id = ts.specialization_id
        LEFT JOIN trainer_language tl ON tl.trainer_id = t.id
        LEFT JOIN languages l ON l.id = tl.language_id
        $whereClause
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $trainers = $stmt->fetchAll();

    $trainers = array_map(function($t) {
        $specs = $t['specializations_list'] ? explode(', ', $t['specializations_list']) : [];
        $langs = $t['languages_list'] ? explode(', ', $t['languages_list']) : [];
        return [
            'id' => (int)$t['id'],
            'firstName' => $t['first_name'],
            'lastName' => $t['last_name'],
            'email' => $t['email'],
            'phone' => $t['phone'],
            'photo' => $t['photo'],
            'experience' => $t['experience'],
            'bio' => $t['bio'],
            'specializations' => $specs,
            'languages' => $langs,
            'modality' => $t['modality'],
            'status' => $t['status'],
            'avgRating' => (float)$t['avg_rating'],
            'country' => $t['country'],
            'city' => $t['city'],
        ];
    }, $trainers);

    success([
        'trainers' => $trainers,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function getTrainer(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM trainers WHERE id = ?");
    $stmt->execute([$id]);
    $trainer = $stmt->fetch();

    if (!$trainer) {
        error('Entrenador no encontrado', 404);
    }

    $specStmt = $db->prepare("
        SELECT s.id, s.name, s.slug 
        FROM specializations s
        JOIN trainer_specialization ts ON ts.specialization_id = s.id
        WHERE ts.trainer_id = ?
    ");
    $specStmt->execute([$id]);
    $specs = $specStmt->fetchAll();

    $langStmt = $db->prepare("
        SELECT l.id, l.name
        FROM languages l
        JOIN trainer_language tl ON tl.language_id = l.id
        WHERE tl.trainer_id = ?
    ");
    $langStmt->execute([$id]);
    $langs = $langStmt->fetchAll();

    $certStmt = $db->prepare("
        SELECT c.name as certification, tc.cert_id_number, tc.cert_file
        FROM trainer_certification tc
        JOIN certifications c ON c.id = tc.certification_id
        WHERE tc.trainer_id = ?
    ");
    $certStmt->execute([$id]);
    $certs = $certStmt->fetchAll();

    $reviewStmt = $db->prepare("
        SELECT r.rating, r.comment, r.created_at,
               CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.trainer_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
    ");
    $reviewStmt->execute([$id]);
    $reviews = $reviewStmt->fetchAll();

    $programStmt = $db->prepare("SELECT id, name, enrollments, difficulty FROM programs WHERE trainer_id = ? AND status = 'active'");
    $programStmt->execute([$id]);
    $programs = $programStmt->fetchAll();

    success([
        'id' => (int)$trainer['id'],
        'userId' => $trainer['user_id'] ? (int)$trainer['user_id'] : null,
        'firstName' => $trainer['first_name'],
        'lastName' => $trainer['last_name'],
        'email' => $trainer['email'],
        'phone' => $trainer['phone'],
        'dateOfBirth' => $trainer['date_of_birth'],
        'gender' => $trainer['gender'],
        'photo' => $trainer['photo'],
        'experience' => $trainer['experience'],
        'bio' => $trainer['bio'],
        'philosophy' => $trainer['philosophy'],
        'social' => [
            'instagram' => $trainer['instagram'],
            'youtube' => $trainer['youtube'],
            'website' => $trainer['website'],
        ],
        'location' => [
            'country' => $trainer['country'],
            'city' => $trainer['city'],
            'timezone' => $trainer['timezone'],
        ],
        'modality' => $trainer['modality'],
        'emergencyContact' => [
            'name' => $trainer['emergency_name'],
            'phone' => $trainer['emergency_phone'],
            'relation' => $trainer['emergency_relation'],
        ],
        'specializations' => $specs,
        'languages' => $langs,
        'certifications' => $certs,
        'status' => $trainer['status'],
        'avgRating' => (float)$trainer['avg_rating'],
        'reviews' => $reviews,
        'programs' => $programs,
    ]);
}

function createTrainer(): void {
    $input = getJsonInput();

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'lastName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'phone' => 'required|string|min:6',
        'password' => 'required|string|min:8|max:255',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    // SECURITY: account takeover prevention. A public application must NEVER
    // modify an existing account (password/role/status). If the email already
    // belongs to a user, reject the application.
    $stmt = $db->prepare("SELECT id, role FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        error('Ya existe una cuenta con este correo. Si ya tienes cuenta, inicia sesión para gestionar tu perfil.', 409);
    }

    // A trainer row with the same email and no linked user may exist from a
    // legacy flow; link it instead of creating a duplicate (email is UNIQUE).
    $trainerStmt = $db->prepare("SELECT id, user_id FROM trainers WHERE email = ?");
    $trainerStmt->execute([$input['email']]);
    $legacyTrainer = $trainerStmt->fetch();

    $hashedPassword = password_hash($input['password'], PASSWORD_BCRYPT);

    $db->beginTransaction();
    try {
        // New account is created as a regular pending user. The coach role is
        // granted exclusively by adminApproveCoach after review (no escalation
        // from a public request).
        $db->prepare("
            INSERT INTO users (first_name, last_name, email, role, password, status)
            VALUES (?, ?, ?, 'client', ?, 'pending')
        ")->execute([
            $input['firstName'],
            $input['lastName'],
            $input['email'],
            $hashedPassword,
        ]);
        $userId = (int)$db->lastInsertId();

        if ($legacyTrainer) {
            $trainerId = (int)$legacyTrainer['id'];
            $db->prepare("
                UPDATE trainers SET
                    user_id = ?, first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?,
                    experience = ?, bio = ?, philosophy = ?, instagram = ?, youtube = ?, website = ?,
                    country = ?, city = ?, timezone = ?, modality = ?,
                    emergency_name = ?, emergency_phone = ?, emergency_relation = ?,
                    terms_accepted = ?, privacy_accepted = ?, marketing_optin = ?,
                    status = 'pending'
                WHERE id = ?
            ")->execute([
                $userId, $input['firstName'], $input['lastName'],
                $input['phone'] ?? null, $input['dateOfBirth'] ?? null, $input['gender'] ?? null,
                $input['experience'] ?? null, $input['bio'] ?? null, $input['philosophy'] ?? null,
                $input['instagram'] ?? null, $input['youtube'] ?? null, $input['website'] ?? null,
                $input['country'] ?? null, $input['city'] ?? null, $input['timezone'] ?? null,
                $input['modality'] ?? null,
                $input['emergName'] ?? null, $input['emergPhone'] ?? null, $input['emergRelation'] ?? null,
                (int)($input['agreeTerms'] ?? false), (int)($input['agreePrivacy'] ?? false), (int)($input['agreeMarketing'] ?? false),
                $trainerId,
            ]);
        } else {
            $db->prepare("
                INSERT INTO trainers (
                    first_name, last_name, email, phone, date_of_birth, gender,
                    experience, bio, philosophy, instagram, youtube, website,
                    country, city, timezone, modality, user_id,
                    emergency_name, emergency_phone, emergency_relation,
                    terms_accepted, privacy_accepted, marketing_optin,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $input['firstName'], $input['lastName'], $input['email'],
                $input['phone'] ?? null, $input['dateOfBirth'] ?? null, $input['gender'] ?? null,
                $input['experience'] ?? null, $input['bio'] ?? null, $input['philosophy'] ?? null,
                $input['instagram'] ?? null, $input['youtube'] ?? null, $input['website'] ?? null,
                $input['country'] ?? null, $input['city'] ?? null, $input['timezone'] ?? null,
                $input['modality'] ?? null, $userId,
                $input['emergName'] ?? null, $input['emergPhone'] ?? null, $input['emergRelation'] ?? null,
                (int)($input['agreeTerms'] ?? false), (int)($input['agreePrivacy'] ?? false), (int)($input['agreeMarketing'] ?? false),
                'pending',
            ]);
            $trainerId = (int)$db->lastInsertId();
        }

        if (!empty($input['specializations'])) {
            $specStmt = $db->prepare("INSERT IGNORE INTO trainer_specialization (trainer_id, specialization_id) VALUES (?, ?)");
            foreach ($input['specializations'] as $specSlug) {
                $s = $db->prepare("SELECT id FROM specializations WHERE slug = ?");
                $s->execute([$specSlug]);
                $specId = $s->fetchColumn();
                if ($specId) {
                    $specStmt->execute([$trainerId, $specId]);
                }
            }
        }

        if (!empty($input['languages'])) {
            $langStmt = $db->prepare("INSERT IGNORE INTO trainer_language (trainer_id, language_id) VALUES (?, ?)");
            foreach ($input['languages'] as $langName) {
                $l = $db->prepare("SELECT id FROM languages WHERE name = ?");
                $l->execute([$langName]);
                $langId = $l->fetchColumn();
                if ($langId) {
                    $langStmt->execute([$trainerId, $langId]);
                }
            }
        }

        if (!empty($input['certType'])) {
            $c = $db->prepare("SELECT id FROM certifications WHERE slug = ?");
            $c->execute([$input['certType']]);
            $certId = $c->fetchColumn();
            if ($certId) {
                $db->prepare("
                    INSERT INTO trainer_certification (trainer_id, certification_id, cert_id_number, cert_file)
                    VALUES (?, ?, ?, ?)
                ")->execute([$trainerId, $certId, $input['certId'] ?? null, $input['certFile'] ?? null]);
            }
        }

        $db->commit();
    } catch (\Exception $e) {
        $db->rollBack();
        error('Error al crear entrenador: ' . $e->getMessage(), 500);
    }

    success([
        'id' => $trainerId,
        'userName' => $input['firstName'] . ' ' . $input['lastName'],
        'firstName' => $input['firstName'],
        'lastName' => $input['lastName'],
        'email' => $input['email'],
        'status' => 'pending',
    ], 'Solicitud de entrenador recibida. Tu perfil será revisado por un administrador.', 201);
}

function updateTrainer(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM trainers WHERE id = ?");
    $stmt->execute([$id]);
    $trainer = $stmt->fetch();
    if (!$trainer) {
        error('Entrenador no encontrado', 404);
    }

    $isAdmin = $auth['role'] === 'admin';
    if (!$isAdmin) {
        $ownerStmt = $db->prepare("SELECT user_id FROM trainers WHERE id = ?");
        $ownerStmt->execute([$id]);
        $ownerId = (int)$ownerStmt->fetchColumn();
        if ($ownerId !== $auth['sub']) {
            error('No tienes permisos para modificar este entrenador', 403);
        }
    }

    $input = getJsonInput();

    $fieldMap = [
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'phone' => 'phone',
        'bio' => 'bio',
        'philosophy' => 'philosophy',
        'experience' => 'experience',
        'country' => 'country',
        'city' => 'city',
        'timezone' => 'timezone',
        'modality' => 'modality',
        'instagram' => 'instagram',
        'youtube' => 'youtube',
        'website' => 'website',
    ];

    if ($isAdmin) {
        $fieldMap['status'] = 'status';
    }

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
        $db->prepare("UPDATE trainers SET " . implode(', ', $updates) . " WHERE id = ?")
            ->execute($params);
    }

    if (isset($input['specializations'])) {
        $db->prepare("DELETE FROM trainer_specialization WHERE trainer_id = ?")->execute([$id]);
        $specStmt = $db->prepare("INSERT IGNORE INTO trainer_specialization (trainer_id, specialization_id) VALUES (?, ?)");
        foreach ($input['specializations'] as $specSlug) {
            $s = $db->prepare("SELECT id FROM specializations WHERE slug = ?");
            $s->execute([$specSlug]);
            $specId = $s->fetchColumn();
            if ($specId) $specStmt->execute([$id, $specId]);
        }
    }

    if (isset($input['languages'])) {
        $db->prepare("DELETE FROM trainer_language WHERE trainer_id = ?")->execute([$id]);
        $langStmt = $db->prepare("INSERT IGNORE INTO trainer_language (trainer_id, language_id) VALUES (?, ?)");
        foreach ($input['languages'] as $langName) {
            $l = $db->prepare("SELECT id FROM languages WHERE name = ?");
            $l->execute([$langName]);
            $langId = $l->fetchColumn();
            if ($langId) $langStmt->execute([$id, $langId]);
        }
    }

    success(null, 'Entrenador actualizado');
}

function deleteTrainer(string $id): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM trainers WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Entrenador no encontrado', 404);
    }

    $db->prepare("DELETE FROM trainers WHERE id = ?")->execute([$id]);
    success(null, 'Entrenador eliminado');
}
