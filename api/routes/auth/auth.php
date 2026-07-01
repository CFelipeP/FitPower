<?php

function registerUser(): void {
    $input = getJsonInput();

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'lastName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'password' => 'required|string|min:8|max:255',
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
    if ($fitnessLevel && !in_array($fitnessLevel, ['beginner', 'intermediate', 'advanced'], true)) {
        $fitnessLevel = null;
    }
    $primaryGoal = $input['selectedGoal'] ?? null;
    if ($primaryGoal && !in_array($primaryGoal, ['fat-loss', 'muscle', 'endurance', 'wellness'], true)) {
        $primaryGoal = null;
    }
    $trainingDays = isset($input['selectedDays']) ? (int)$input['selectedDays'] : null;
    if ($trainingDays !== null && ($trainingDays < 1 || $trainingDays > 7)) {
        $trainingDays = null;
    }

    $verificationToken = bin2hex(random_bytes(32));

    $stmt = $db->prepare("
        INSERT INTO users (first_name, last_name, email, role, password, fitness_level, primary_goal, training_days, status, remember_token)
        VALUES (?, ?, ?, 'client', ?, ?, ?, ?, 'pending', ?)
    ");
    $stmt->execute([
        $input['firstName'],
        $input['lastName'],
        $input['email'],
        $hashedPassword,
        $fitnessLevel,
        $primaryGoal,
        $trainingDays,
        $verificationToken,
    ]);

    $userId = (int)$db->lastInsertId();
    $token = generateJWT(['sub' => $userId, 'role' => 'client', 'tv' => 0]);
    $refreshToken = generateRefreshToken($userId);

    try {
        if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
            require_once __DIR__ . '/../../helpers/mailer.php';
            sendWelcomeEmail($input['email'], $input['firstName']);

            $verifyLink = APP_URL . '/login?verify_token=' . $verificationToken;
            sendEmail($input['email'], 'FitPower - Verify Your Email', "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                <div style='text-align: center; padding: 20px 0;'>
                    <h1 style='color: #FFD600; margin: 0;'>⚡ FitPower</h1>
                </div>
                <h2>Verify Your Email</h2>
                <p>Hi {$input['firstName']}, thanks for signing up! Please verify your email by clicking the button below:</p>
                <div style='text-align: center; padding: 20px;'>
                    <a href='$verifyLink' style='background: #FFD600; color: #000; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Verify Email</a>
                </div>
                <p>If you didn't create a FitPower account, you can safely ignore this email.</p>
                <hr style='border: none; border-top: 1px solid #eee;' />
                <p style='color: #888; font-size: 12px;'>FitPower — Train Without Limits</p>
            </div>");
        }
    } catch (\Throwable $e) {
        // Email sending failed silently — don't break registration
    }

    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($userId, 'signup', 'Bienvenido a FitPower', 'UserPlus', '#10b981', 'New', 'bg-success');

    success([
        'token' => $token,
        'refresh_token' => $refreshToken,
        'csrf_token' => generateCsrfToken(),
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

    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $identifier = hash('sha256', $input['email'] . '|' . $ip);
    checkLoginThrottle($identifier, $ip);

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['password'], $user['password'])) {
        recordLoginAttempt($identifier, $ip, false);
        error('Credenciales inválidas', 401);
    }

    if ($user['status'] === 'suspended') {
        error('Cuenta suspendida', 403);
    }

    recordLoginAttempt($identifier, $ip, true);

    $role = $user['role'] ?? 'client';

    $token = generateJWT(['sub' => (int)$user['id'], 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
    $refreshToken = generateRefreshToken((int)$user['id']);

    success([
        'token' => $token,
        'refresh_token' => $refreshToken,
        'csrf_token' => generateCsrfToken(),
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

    try {
        if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
            require_once __DIR__ . '/../../helpers/mailer.php';
            sendPasswordResetEmail($input['email'], $token);
        }
    } catch (\Throwable $e) {}

    success(['resetToken' => $token], 'Check your email for the reset link');
}

function resetPassword(): void {
    $input = getJsonInput();

    $rules = [
        'token' => 'required|string',
        'password' => 'required|string|min:8|max:255',
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

function googleLogin(): void {
    $input = getJsonInput();
    $rules = ['credential' => 'required|string'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);

    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($input['credential']));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) error('Token de Google inválido', 401);

    $google = json_decode($response, true);
    if (!$google || !isset($google['email'])) error('No se pudo verificar el token', 401);

    $clientId = GOOGLE_CLIENT_ID;
    if ($clientId && ($google['aud'] ?? '') !== $clientId) error('Token no emitido para esta aplicación', 401);

    $email = $google['email'];
    $firstName = $google['given_name'] ?? explode('@', $email)[0];
    $lastName = $google['family_name'] ?? '';

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') error('Cuenta suspendida', 403);
        $role = $user['role'] ?? 'client';
        $token = generateJWT(['sub' => (int)$user['id'], 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
        $refreshToken = generateRefreshToken((int)$user['id']);
        success([
            'token' => $token, 'refresh_token' => $refreshToken, 'csrf_token' => generateCsrfToken(),
            'needsPasswordSetup' => empty($user['password']),
            'user' => ['id' => (int)$user['id'], 'firstName' => $user['first_name'], 'lastName' => $user['last_name'], 'email' => $user['email'], 'role' => $role, 'photo' => $google['picture'] ?? $user['photo']],
        ], 'Inicio de sesión exitoso');
        return;
    }

    $db->prepare("INSERT INTO users (first_name, last_name, email, role, status, password, photo) VALUES (?, ?, ?, 'client', 'active', '', ?)")
        ->execute([$firstName, $lastName, $email, $google['picture'] ?? null]);
    $userId = (int)$db->lastInsertId();

    $token = generateJWT(['sub' => $userId, 'role' => 'client', 'tv' => 0]);
    $refreshToken = generateRefreshToken($userId);

    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($userId, 'signup', 'Bienvenido a FitPower (Google)', 'UserPlus', '#10b981', 'New', 'bg-success');

    success([
        'token' => $token, 'refresh_token' => $refreshToken, 'csrf_token' => generateCsrfToken(),
        'needsPasswordSetup' => true,
        'user' => ['id' => $userId, 'firstName' => $firstName, 'lastName' => $lastName, 'email' => $email, 'role' => 'client', 'photo' => $google['picture'] ?? null],
    ], 'Registro exitoso', 201);
}

function setPassword(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['password' => 'required|string|min:8|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $hashed = password_hash($input['password'], PASSWORD_BCRYPT);
    $db->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hashed, $auth['sub']]);
    success(null, 'Contraseña establecida exitosamente');
}

function googleRedirect(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    $clientId = GOOGLE_CLIENT_ID;
    if (!$clientId) error('Google Client ID no configurado', 500);

    $state = bin2hex(random_bytes(16));
    $_SESSION['google_oauth_state'] = $state;

    $redirectUri = APP_URL . '/google-callback.html';
    $params = http_build_query([
        'client_id' => $clientId, 'redirect_uri' => $redirectUri,
        'response_type' => 'code', 'scope' => 'openid email profile',
        'state' => $state, 'access_type' => 'offline', 'prompt' => 'select_account',
    ]);
    $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;

    header('Location: ' . $url);
    exit;
}

function googleCallback(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    $input = getJsonInput();
    $code = $input['code'] ?? '';
    $state = $input['state'] ?? '';

    if (!$code) error('Código de autorización requerido', 400);
    if (!$state || $state !== ($_SESSION['google_oauth_state'] ?? '')) error('Estado inválido', 400);
    unset($_SESSION['google_oauth_state']);

    $clientId = GOOGLE_CLIENT_ID;
    $clientSecret = GOOGLE_CLIENT_SECRET;
    if (!$clientId) error('Google Client ID no configurado', 500);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'code' => $code, 'client_id' => $clientId, 'client_secret' => $clientSecret,
        'redirect_uri' => APP_URL . '/google-callback.html', 'grant_type' => 'authorization_code',
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $tokenResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) error('Error al intercambiar código con Google', 401);
    $tokenData = json_decode($tokenResponse, true);
    $accessToken = $tokenData['access_token'] ?? '';
    if (!$accessToken) error('No se pudo obtener token de acceso', 401);

    $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $userResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) error('No se pudo obtener información del usuario', 401);
    $googleUser = json_decode($userResponse, true);
    if (!$googleUser || !isset($googleUser['email'])) error('No se pudo obtener email del usuario', 401);

    $email = $googleUser['email'];
    $firstName = $googleUser['given_name'] ?? explode('@', $email)[0];
    $lastName = $googleUser['family_name'] ?? '';
    $picture = $googleUser['picture'] ?? null;

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') error('Cuenta suspendida', 403);
        $userId = (int)$user['id'];
        $role = $user['role'] ?? 'client';
        $firstName = $user['first_name'];
        $lastName = $user['last_name'];
        $picture = $user['photo'] ?? $picture;
        $token = generateJWT(['sub' => $userId, 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
        $refreshToken = generateRefreshToken($userId);
        $needsPassword = empty($user['password']);
    } else {
        $db->prepare("INSERT INTO users (first_name, last_name, email, role, status, password, photo) VALUES (?, ?, ?, 'client', 'active', '', ?)")
            ->execute([$firstName, $lastName, $email, $picture]);
        $userId = (int)$db->lastInsertId();
        $token = generateJWT(['sub' => $userId, 'role' => 'client', 'tv' => 0]);
        $refreshToken = generateRefreshToken($userId);
        $needsPassword = true;
    }

    success([
        'token' => $token, 'refresh_token' => $refreshToken, 'csrf_token' => generateCsrfToken(),
        'needsPasswordSetup' => $needsPassword,
        'user' => ['id' => $userId, 'firstName' => $firstName, 'lastName' => $lastName, 'email' => $email, 'role' => ($role ?? 'client'), 'photo' => $picture],
    ]);
}

function googleCallbackGet(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    $code = $_GET['code'] ?? '';
    $state = $_GET['state'] ?? '';
    $error = $_GET['error'] ?? '';

    $loginUrl = APP_URL . '/login';
    if ($error) { header('Location: ' . $loginUrl . '?error=' . urlencode($error)); exit; }
    if (!$code) { header('Location: ' . $loginUrl . '?error=no_code'); exit; }
    if (!$state || $state !== ($_SESSION['google_oauth_state'] ?? '')) { header('Location: ' . $loginUrl . '?error=invalid_state'); exit; }
    unset($_SESSION['google_oauth_state']);

    $clientId = GOOGLE_CLIENT_ID;
    $clientSecret = GOOGLE_CLIENT_SECRET;
    if (!$clientId) { header('Location: ' . $loginUrl . '?error=no_client_id'); exit; }

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'code' => $code, 'client_id' => $clientId, 'client_secret' => $clientSecret,
        'redirect_uri' => APP_URL . '/google-callback.html', 'grant_type' => 'authorization_code',
    ]));

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $tokenResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) { header('Location: ' . $loginUrl . '?error=token_exchange_failed'); exit; }

    $tokenData = json_decode($tokenResponse, true);
    $accessToken = $tokenData['access_token'] ?? '';
    if (!$accessToken) { header('Location: ' . $loginUrl . '?error=no_access_token'); exit; }

    $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $userResponse = curl_exec($ch);
    curl_close($ch);

    $googleUser = json_decode($userResponse, true);
    if (!$googleUser || !isset($googleUser['email'])) { header('Location: ' . $loginUrl . '?error=no_user_info'); exit; }

    $email = $googleUser['email'];
    $firstName = $googleUser['given_name'] ?? explode('@', $email)[0];
    $lastName = $googleUser['family_name'] ?? '';
    $picture = $googleUser['picture'] ?? null;

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') { header('Location: ' . $loginUrl . '?error=suspended'); exit; }
        $userId = (int)$user['id'];
        $role = $user['role'] ?? 'client';
        $jwt = generateJWT(['sub' => $userId, 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
        $refreshToken = generateRefreshToken($userId);
        $needsPassword = empty($user['password']);
    } else {
        $db->prepare("INSERT INTO users (first_name, last_name, email, role, status, password, photo) VALUES (?, ?, ?, 'client', 'active', '', ?)")
            ->execute([$firstName, $lastName, $email, $picture]);
        $userId = (int)$db->lastInsertId();
        $jwt = generateJWT(['sub' => $userId, 'role' => 'client', 'tv' => 0]);
        $refreshToken = generateRefreshToken($userId);
        $needsPassword = true;
    }

    $frontendUrl = $loginUrl . '?token=' . urlencode($jwt) . '&refresh_token=' . urlencode($refreshToken);
    if ($needsPassword) {
        $frontendUrl .= '&setup_password=1';
    }

    header('Location: ' . $frontendUrl);
    exit;
}

function saveFcmToken(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['fcm_token' => 'required|string|min:10'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $db->prepare("UPDATE users SET fcm_token = ? WHERE id = ?")
        ->execute([$input['fcm_token'], $auth['sub']]);
    success(null, 'FCM token guardado');
}

function revokeAllSessions(): void {
    $auth = requireAuth();
    $db = getDB();
    $db->prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?")->execute([$auth['sub']]);
    $db->prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")->execute([$auth['sub']]);
    success(null, 'Todas las sesiones han sido revocadas');
}
