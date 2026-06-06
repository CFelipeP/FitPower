<?php

function listUsers(): void {
    $auth = requireAuth();

    $db = getDB();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $search = $_GET['search'] ?? '';

    $where = '';
    $params = [];

    if ($search) {
        $where = "WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
        $searchTerm = "%$search%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("SELECT id, first_name, last_name, email, fitness_level, primary_goal, status, created_at FROM users $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    $users = array_map(function($u) {
        return [
            'id' => (int)$u['id'],
            'firstName' => $u['first_name'],
            'lastName' => $u['last_name'],
            'email' => $u['email'],
            'fitnessLevel' => $u['fitness_level'],
            'primaryGoal' => $u['primary_goal'],
            'status' => $u['status'],
            'registered' => $u['created_at'],
        ];
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

    $input = getJsonInput();

    $allowedFields = ['firstName', 'lastName', 'fitnessLevel', 'primaryGoal', 'trainingDays', 'photo'];
    $updates = [];
    $params = [];

    $fieldMap = [
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'fitnessLevel' => 'fitness_level',
        'primaryGoal' => 'primary_goal',
        'trainingDays' => 'training_days',
        'photo' => 'photo',
    ];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = $fieldMap[$field] . ' = ?';
            $params[] = $input[$field];
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
    $role = $auth['role'] ?? 'client';
    $db = getDB();

    if ($role === 'admin') {
        $stmt = $db->query("SELECT id, first_name, last_name, email FROM users ORDER BY first_name");
        $users = $stmt->fetchAll();
    } elseif ($role === 'coach') {
        $stmt = $db->prepare("
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
            FROM users u
            JOIN user_programs up ON up.user_id = u.id
            JOIN programs p ON p.id = up.program_id
            JOIN trainers t ON t.id = p.trainer_id
            WHERE t.user_id = ? AND u.id != ?
            ORDER BY u.first_name
        ");
        $stmt->execute([$userId, $userId]);
        $users = $stmt->fetchAll();
    } else {
        $stmt = $db->prepare("
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
            FROM users u
            JOIN trainers t ON t.user_id = u.id
            JOIN programs p ON p.trainer_id = t.id
            JOIN user_programs up ON up.program_id = p.id
            WHERE up.user_id = ? AND u.id != ?
            ORDER BY u.first_name
        ");
        $stmt->execute([$userId, $userId]);
        $users = $stmt->fetchAll();
    }

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

function deleteUser(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Usuario no encontrado', 404);
    }

    $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
    success(null, 'Usuario eliminado');
}
