<?php

function listUsers(): void {
    $auth = requireAuth();
    $db = getDB();
    $isAdmin = $auth['role'] === 'admin';

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $search = $_GET['search'] ?? '';
    $roleFilter = $_GET['role'] ?? '';
    $statusFilter = $_GET['status'] ?? '';

    $where = [];
    $params = [];

    if ($search) {
        $where[] = "(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
        $searchTerm = "%$search%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }

    if ($roleFilter) {
        $where[] = "role = ?";
        $params[] = $roleFilter;
    }

    if ($statusFilter) {
        $where[] = "status = ?";
        $params[] = $statusFilter;
    }

    if (!$isAdmin) {
        $where[] = "status = 'active'";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $selectFields = $isAdmin
        ? "id, first_name, last_name, email, role, fitness_level, primary_goal, status, created_at, updated_at"
        : "id, first_name, last_name, email, fitness_level, primary_goal, status, created_at";

    $stmt = $db->prepare("SELECT $selectFields FROM users $whereClause ORDER BY created_at DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    $users = array_map(function($u) {
        $result = [
            'id' => (int)$u['id'],
            'firstName' => $u['first_name'],
            'lastName' => $u['last_name'],
            'email' => $u['email'],
            'fitnessLevel' => $u['fitness_level'],
            'primaryGoal' => $u['primary_goal'],
            'status' => $u['status'],
            'registered' => $u['created_at'],
        ];
        if (isset($u['role'])) {
            $result['role'] = $u['role'];
            $result['lastActive'] = $u['updated_at'];
        }
        return $result;
    }, $users);

    success([
        'users' => $users,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
        'lastPage' => ceil($total / $perPage),
    ]);
}

function getUser(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id, first_name, last_name, email, fitness_level, primary_goal, training_days, photo, status, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Usuario no encontrado', 404);
    }

    $subscription = null;
    $subStmt = $db->prepare("
        SELECT us.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.starts_at DESC LIMIT 1
    ");
    $subStmt->execute([$id]);
    $subData = $subStmt->fetch();
    if ($subData) {
        $subscription = [
            'plan' => $subData['plan_name'],
            'billing' => $subData['billing'],
            'startedAt' => $subData['starts_at'],
        ];
    }

    $enrolledStmt = $db->prepare("
        SELECT p.name, up.progress, up.current_week
        FROM user_programs up
        JOIN programs p ON p.id = up.program_id
        WHERE up.user_id = ? AND up.status = 'active'
    ");
    $enrolledStmt->execute([$id]);
    $enrolled = $enrolledStmt->fetch();

    success([
        'id' => (int)$user['id'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'email' => $user['email'],
        'fitnessLevel' => $user['fitness_level'],
        'primaryGoal' => $user['primary_goal'],
        'trainingDays' => $user['training_days'],
        'photo' => $user['photo'],
        'status' => $user['status'],
        'memberSince' => $user['created_at'],
        'lastActive' => $user['updated_at'],
        'subscription' => $subscription,
        'currentProgram' => $enrolled ? [
            'name' => $enrolled['name'],
            'progress' => (float)$enrolled['progress'],
            'week' => (int)$enrolled['current_week'],
        ] : null,
    ]);
}

function updateUser(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Usuario no encontrado', 404);
    }

    if ($auth['sub'] != $id && $auth['role'] !== 'admin') {
        error('No tienes permisos para modificar este usuario', 403);
    }

    $input = getJsonInput();

    $rules = [];
    if (isset($input['firstName'])) $rules['firstName'] = 'string|min:1|max:100';
    if (isset($input['lastName'])) $rules['lastName'] = 'string|min:1|max:100';
    if (isset($input['fitnessLevel'])) $rules['fitnessLevel'] = 'in:beginner,intermediate,advanced';
    if (isset($input['primaryGoal'])) $rules['primaryGoal'] = 'in:fat-loss,muscle,endurance,wellness';
    if (isset($input['trainingDays'])) $rules['trainingDays'] = 'numeric|min_value:1|max_value:7';
    if (isset($input['photo'])) $rules['photo'] = 'string|max:500';

    if ($rules) {
        $errors = validate($input, $rules);
        if ($errors) {
            error('Error de validación', 422, $errors);
        }
    }

    $fieldMap = [
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'fitnessLevel' => 'fitness_level',
        'primaryGoal' => 'primary_goal',
        'trainingDays' => 'training_days',
        'photo' => 'photo',
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
    $db->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    success(null, 'Usuario actualizado');
}

function listContacts(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $stmt = $db->prepare("SELECT id, first_name, last_name, email FROM users WHERE id != ? ORDER BY first_name");
    $stmt->execute([$userId]);
    $users = $stmt->fetchAll();

    $result = array_map(function($u) {
        return [
            'id' => (int)$u['id'],
            'firstName' => $u['first_name'],
            'lastName' => $u['last_name'],
            'email' => $u['email'],
        ];
    }, $users);

    success($result);
}

// --- Admin User Management ---

function adminListUsers(): void {
    requireRole('admin');
    listUsers();
}

function adminGetUser(string $id): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Usuario no encontrado', 404);
    }

    $subscription = null;
    $subStmt = $db->prepare("
        SELECT us.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.starts_at DESC LIMIT 1
    ");
    $subStmt->execute([$id]);
    $subData = $subStmt->fetch();
    if ($subData) {
        $subscription = [
            'id' => (int)$subData['id'],
            'plan' => $subData['plan_name'],
            'billing' => $subData['billing'],
            'status' => $subData['status'],
            'startedAt' => $subData['starts_at'],
            'endsAt' => $subData['ends_at'],
        ];
    }

    $stmt = $db->prepare("
        SELECT p.name, up.progress, up.current_week, up.status, up.started_at
        FROM user_programs up
        JOIN programs p ON p.id = up.program_id
        WHERE up.user_id = ?
        ORDER BY up.started_at DESC
    ");
    $stmt->execute([$id]);
    $programs = $stmt->fetchAll();

    $metricStmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 5");
    $metricStmt->execute([$id]);
    $metrics = $metricStmt->fetchAll();

    success([
        'id' => (int)$user['id'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'fitnessLevel' => $user['fitness_level'],
        'primaryGoal' => $user['primary_goal'],
        'trainingDays' => $user['training_days'],
        'photo' => $user['photo'],
        'status' => $user['status'],
        'settings' => $user['settings'] ? json_decode($user['settings'], true) : null,
        'memberSince' => $user['created_at'],
        'lastActive' => $user['updated_at'],
        'subscription' => $subscription,
        'programs' => array_map(function($p) {
            return [
                'name' => $p['name'],
                'progress' => (float)$p['progress'],
                'week' => (int)$p['current_week'],
                'status' => $p['status'],
                'startedAt' => $p['started_at'],
            ];
        }, $programs),
        'recentMetrics' => array_map(function($m) {
            return [
                'date' => $m['log_date'],
                'weight' => (float)$m['weight_kg'],
                'bodyFat' => (float)$m['body_fat_pct'],
                'muscle' => (float)$m['muscle_kg'],
                'bmi' => (float)$m['bmi'],
            ];
        }, $metrics),
    ]);
}

function adminUpdateUser(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();
    $isSelf = (int)$id === (int)$auth['sub'];

    $stmt = $db->prepare("SELECT id, role, status FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        error('Usuario no encontrado', 404);
    }

    $input = getJsonInput();

    $rules = [];
    if (isset($input['firstName'])) $rules['firstName'] = 'string|min:1|max:100';
    if (isset($input['lastName'])) $rules['lastName'] = 'string|min:1|max:100';
    if (isset($input['email'])) $rules['email'] = 'email';
    if (isset($input['role'])) $rules['role'] = 'in:admin,coach,client';
    if (isset($input['status'])) $rules['status'] = 'in:active,pending,suspended';
    if (isset($input['fitnessLevel'])) $rules['fitnessLevel'] = 'in:beginner,intermediate,advanced';
    if (isset($input['primaryGoal'])) $rules['primaryGoal'] = 'in:fat-loss,muscle,endurance,wellness';
    if (isset($input['trainingDays'])) $rules['trainingDays'] = 'numeric|min_value:1|max_value:7';
    if (isset($input['photo'])) $rules['photo'] = 'string|max:500';

    if ($rules) {
        $errors = validate($input, $rules);
        if ($errors) {
            error('Error de validación', 422, $errors);
        }
    }

    // Prevent admin from suspending or demoting themselves
    if ($isSelf) {
        if (isset($input['status']) && $input['status'] === 'suspended') {
            error('No puedes suspender tu propia cuenta', 403);
        }
        if (isset($input['role']) && $input['role'] !== 'admin') {
            error('No puedes cambiar tu propio rol de administrador', 403);
        }
    }

    // Prevent demoting the last admin
    if (isset($input['role']) && $input['role'] !== 'admin' && $targetUser['role'] === 'admin') {
        $adminCount = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn();
        if ($adminCount <= 1) {
            error('Debe haber al menos un administrador activo en el sistema', 409);
        }
    }

    // If changing email, verify it's not taken
    if (isset($input['email']) && $input['email']) {
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$input['email'], $id]);
        if ($stmt->fetch()) {
            error('El email ya está en uso por otro usuario', 409);
        }
    }

    $allowedFields = [
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'email' => 'email',
        'fitnessLevel' => 'fitness_level',
        'primaryGoal' => 'primary_goal',
        'trainingDays' => 'training_days',
        'photo' => 'photo',
        'role' => 'role',
        'status' => 'status',
    ];

    $updates = [];
    $params = [];

    foreach ($allowedFields as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }

    if (empty($updates)) {
        error('No hay campos para actualizar', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    if (isset($input['role']) && $input['role'] !== $targetUser['role']) {
        logAdminAction($auth['sub'], 'change_role', 'user', (int)$id, ['from' => $targetUser['role'], 'to' => $input['role']]);
    }
    if (isset($input['status']) && $input['status'] !== $targetUser['status']) {
        logAdminAction($auth['sub'], 'change_status', 'user', (int)$id, ['from' => $targetUser['status'], 'to' => $input['status']]);
    }

    success(null, 'Usuario actualizado');
}

function adminCreateUser(): void {
    requireRole('admin');
    $input = getJsonInput();

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'lastName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'password' => 'required|string|min:8|max:255',
        'role' => 'in:admin,coach,client',
        'status' => 'in:active,pending,suspended',
        'fitnessLevel' => 'in:beginner,intermediate,advanced',
        'primaryGoal' => 'in:fat-loss,muscle,endurance,wellness',
        'trainingDays' => 'numeric|min_value:1|max_value:7',
        'photo' => 'string|max:500',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        error('El email ya está registrado', 409);
    }

    $role = in_array($input['role'] ?? 'client', ['admin', 'coach', 'client'], true) ? $input['role'] : 'client';
    $status = in_array($input['status'] ?? 'active', ['active', 'pending', 'suspended'], true) ? $input['status'] : 'active';
    $fitnessLevel = $input['fitnessLevel'] ?? null;
    $primaryGoal = $input['primaryGoal'] ?? null;
    $trainingDays = $input['trainingDays'] ?? null;
    $photo = $input['photo'] ?? null;

    $stmt = $db->prepare("
        INSERT INTO users (first_name, last_name, email, password, role, status, fitness_level, primary_goal, training_days, photo, email_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    ");
    $stmt->execute([
        $input['firstName'],
        $input['lastName'],
        $input['email'],
        password_hash($input['password'], PASSWORD_BCRYPT),
        $role,
        $status,
        $fitnessLevel,
        $primaryGoal,
        $trainingDays,
        $photo,
    ]);

    success(['id' => (int)$db->lastInsertId()], 'Usuario creado', 201);
}

function adminListCoaches(): void {
    requireRole('admin');
    $db = getDB();

    $status = $_GET['status'] ?? '';

    $where = "WHERE u.role = 'coach'";
    $params = [];

    if ($status) {
        $where .= " AND t.status = ?";
        $params[] = $status;
    }

    $stmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, u.email, u.status as user_status, u.created_at,
               t.id as trainer_id, t.status as trainer_status, t.avg_rating, t.experience, t.bio
        FROM users u
        LEFT JOIN trainers t ON t.user_id = u.id
        $where
        ORDER BY u.created_at DESC
    ");
    $stmt->execute($params);
    $coaches = $stmt->fetchAll();

    $result = array_map(function($c) {
        return [
            'id' => (int)$c['id'],
            'firstName' => $c['first_name'],
            'lastName' => $c['last_name'],
            'email' => $c['email'],
            'status' => $c['user_status'],
            'trainerId' => $c['trainer_id'] ? (int)$c['trainer_id'] : null,
            'trainerStatus' => $c['trainer_status'],
            'avgRating' => (float)$c['avg_rating'],
            'experience' => $c['experience'],
            'bio' => $c['bio'],
            'registered' => $c['created_at'],
        ];
    }, $coaches);

    success($result);
}

function adminApproveCoach(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    // Verify the target user exists and is a coach
    $stmt = $db->prepare("SELECT id, role FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Usuario no encontrado', 404);
    }
    if ($user['role'] !== 'coach') {
        error('El usuario no es un coach', 400);
    }

    // Validate using the validator for consistency
    $status = $input['status'] ?? 'approved';
    $errorsValidate = validate(['status' => $status], ['status' => 'in:approved,rejected,suspended']);
    if ($errorsValidate) {
        error('Estado inválido', 400, $errorsValidate);
    }

    $stmt = $db->prepare("UPDATE trainers SET status = ? WHERE user_id = ?");
    $stmt->execute([$status, $id]);

    $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $stmt->execute([$id]);
    $trainerId = $stmt->fetchColumn();

    if ($trainerId && $status === 'approved') {
        $stmt = $db->prepare("UPDATE users SET status = 'active', email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?");
        $stmt->execute([$id]);
    }

    logAdminAction($auth['sub'], 'approve_coach', 'user', (int)$id, null);

    $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) VALUES (?, 'account', 'Coach Approved', ?, 'Award', '/coach/dashboard', NOW())")->execute([(int)$id, 'Congratulations! Your coach profile has been approved.']);

    success(null, 'Coach ' . ($status === 'approved' ? 'approved' : ($status === 'rejected' ? 'rejected' : 'suspended')));
}

function adminBatchSuspend(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $ids = $input['ids'] ?? [];
    if (empty($ids)) error('Must include user IDs', 422);
    $db = getDB();
    $stmt = $db->prepare("UPDATE users SET status = 'suspended' WHERE id = ? AND id != ?");
    $count = 0;
    foreach ($ids as $id) {
        $stmt->execute([(int)$id, $auth['sub']]);
        $count += $stmt->rowCount();
    }
    success(['affected' => $count], "$count users suspended");
}

function adminBatchActivate(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $ids = $input['ids'] ?? [];
    if (empty($ids)) error('Must include user IDs', 422);
    $db = getDB();
    $stmt = $db->prepare("UPDATE users SET status = 'active' WHERE id = ?");
    $count = 0;
    foreach ($ids as $id) {
        $stmt->execute([(int)$id]);
        $count += $stmt->rowCount();
    }
    success(['affected' => $count], "$count users activated");
}

function deleteUser(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();

    if ((int)$id === (int)$auth['sub']) {
        error('You cannot suspend your own account', 403);
    }

    $stmt = $db->prepare("SELECT id, email, role FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        error('User not found', 404);
    }

    // Prevent suspending the last active admin
    if ($targetUser['role'] === 'admin') {
        $adminCount = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn();
        if ($adminCount <= 1) {
            error('Cannot suspend the only active admin', 409);
        }
    }

    $db->prepare("UPDATE users SET status = 'suspended' WHERE id = ?")->execute([$id]);

    $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) VALUES (?, 'account', 'Account Suspended', ?, 'Shield', '/client/dashboard', NOW())")->execute([(int)$id, 'Your account has been suspended. Contact support for more information.']);

    logAdminAction($auth['sub'], 'suspend_user', 'user', (int)$id, ['email' => $targetUser['email'] ?? '']);

    success(null, 'User suspended');
}

function adminDeleteUser(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();

    if ((int)$id === (int)$auth['sub']) {
        error('You cannot delete your own account', 403);
    }

    $stmt = $db->prepare("SELECT id, email, role FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        error('User not found', 404);
    }

    if ($targetUser['role'] === 'admin') {
        $adminCount = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn();
        if ($adminCount <= 1) {
            error('Cannot delete the only active admin', 409);
        }
    }

    try {
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
    } catch (\PDOException $e) {
        if (str_contains($e->getMessage(), 'foreign key constraint') || str_contains($e->getMessage(), 'a foreign key constraint fails')) {
            $db->prepare("UPDATE users SET status = 'suspended' WHERE id = ?")->execute([$id]);
            logAdminAction($auth['sub'], 'suspend_user', 'user', (int)$id, ['email' => $targetUser['email'] ?? '', 'reason' => 'has_related_data']);
            success(null, 'User has associated data and was suspended instead');
        }
        error('Error deleting user: ' . $e->getMessage(), 500);
    }

    logAdminAction($auth['sub'], 'delete_user', 'user', (int)$id, ['email' => $targetUser['email'] ?? '']);

    success(null, 'User permanently deleted');
}

function adminBatchDelete(): void {
    $auth = requireRole('admin');
    $db = getDB();
    $body = getJsonInput();
    $ids = $body['ids'] ?? [];

    if (empty($ids) || !is_array($ids)) {
        error('No users selected', 400);
    }

    $ids = array_map('intval', $ids);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $db->prepare("SELECT id, email, role FROM users WHERE id IN ($placeholders)");
    $stmt->execute($ids);
    $users = $stmt->fetchAll();

    $deleted = 0;
    $skipped = 0;
    foreach ($users as $u) {
        if ((int)$u['id'] === (int)$auth['sub']) { $skipped++; continue; }
        if ($u['role'] === 'admin') {
            $adminCount = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn();
            if ($adminCount <= 1) { $skipped++; continue; }
        }
        try {
            $db->prepare("DELETE FROM users WHERE id = ?")->execute([$u['id']]);
            logAdminAction($auth['sub'], 'delete_user', 'user', (int)$u['id'], ['email' => $u['email'] ?? '', 'batch' => true]);
            $deleted++;
        } catch (\PDOException $e) {
            if (str_contains($e->getMessage(), 'foreign key constraint') || str_contains($e->getMessage(), 'a foreign key constraint fails')) {
                $db->prepare("UPDATE users SET status = 'suspended' WHERE id = ?")->execute([$u['id']]);
                logAdminAction($auth['sub'], 'suspend_user', 'user', (int)$u['id'], ['email' => $u['email'] ?? '', 'batch' => true, 'reason' => 'has_related_data']);
                $skipped++;
            } else {
                $skipped++;
            }
        }
    }

    success(['deleted' => $deleted, 'skipped' => $skipped], "$deleted users deleted" . ($skipped ? ", $skipped suspended (had associated data)" : ''));
}
