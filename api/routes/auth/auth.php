<?php

function registerUser(): void {
    $input = getJsonInput();

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'lastName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'password' => 'required|string|min:8',
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

    $hashedPassword = password_hash($input['password'], PASSWORD_BCRYPT);
    $fitnessLevel = $input['selectedLevel'] ?? null;
    $primaryGoal = $input['selectedGoal'] ?? null;
    $trainingDays = isset($input['selectedDays']) ? (int)$input['selectedDays'] : null;

    $stmt = $db->prepare("
        INSERT INTO users (first_name, last_name, email, role, password, fitness_level, primary_goal, training_days, status)
        VALUES (?, ?, ?, 'client', ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([
        $input['firstName'],
        $input['lastName'],
        $input['email'],
        $hashedPassword,
        $fitnessLevel,
        $primaryGoal,
        $trainingDays,
    ]);

    $userId = (int)$db->lastInsertId();
    $token = generateJWT(['sub' => $userId, 'role' => 'client']);

    require_once __DIR__ . '/../../helpers/mailer.php';
    sendWelcomeEmail($input['email'], $input['firstName']);

    success([
        'token' => $token,
        'user' => [
            'id' => $userId,
            'firstName' => $input['firstName'],
            'lastName' => $input['lastName'],
            'email' => $input['email'],
            'role' => 'client',
        ],
    ], 'Registro exitoso', 201);
}

function loginUser(): void {
    $input = getJsonInput();

    $rules = [
        'email' => 'required|email',
        'password' => 'required|string',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['password'], $user['password'])) {
        error('Credenciales inválidas', 401);
    }

    if ($user['status'] === 'suspended') {
        error('Cuenta suspendida', 403);
    }

    $role = $user['role'] ?? 'client';

    $token = generateJWT(['sub' => (int)$user['id'], 'role' => $role]);

    success([
        'token' => $token,
        'user' => [
            'id' => (int)$user['id'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'email' => $user['email'],
            'role' => $role,
            'fitnessLevel' => $user['fitness_level'],
            'primaryGoal' => $user['primary_goal'],
            'photo' => $user['photo'],
        ],
    ], 'Inicio de sesión exitoso');
}

function getCurrentUser(): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id, first_name, last_name, email, role, fitness_level, primary_goal, training_days, photo, status, created_at FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Usuario no encontrado', 404);
    }

    $userData = [
        'id' => (int)$user['id'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'email' => $user['email'],
        'role' => $user['role'] ?? 'client',
        'fitnessLevel' => $user['fitness_level'],
        'primaryGoal' => $user['primary_goal'],
        'trainingDays' => $user['training_days'],
        'photo' => $user['photo'],
        'status' => $user['status'],
        'memberSince' => $user['created_at'],
    ];

    success($userData);
}

function forgotPassword(): void {
    $input = getJsonInput();

    $errors = validate($input, ['email' => 'required|email']);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    if (!$stmt->fetch()) {
        success(null, 'Si el email existe, recibirás un código de recuperación');
        return;
    }

    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600);

    $stmt = $db->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$input['email'], $token, $expires]);

    require_once __DIR__ . '/../../helpers/mailer.php';
    sendPasswordResetEmail($input['email'], $token);

    success(null, 'Check your email for the reset link');
}

function resetPassword(): void {
    $input = getJsonInput();

    $rules = [
        'token' => 'required|string',
        'password' => 'required|string|min:8',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()");
    $stmt->execute([$input['token']]);
    $reset = $stmt->fetch();

    if (!$reset) {
        error('Token inválido o expirado', 400);
    }

    $hashedPassword = password_hash($input['password'], PASSWORD_BCRYPT);

    $db->prepare("UPDATE users SET password = ? WHERE email = ?")
        ->execute([$hashedPassword, $reset['email']]);

    $db->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
        ->execute([$reset['id']]);

    success(null, 'Contraseña actualizada exitosamente');
}
