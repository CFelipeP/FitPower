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
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        error('Email already registered', 409);
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
    logActivity($userId, 'signup', 'Welcome to FitPower', 'UserPlus', '#10b981', 'New', 'bg-success');

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
    ], 'Registration successful', 201);
}

function loginUser(): void {
    $input = getJsonInput();

    $rules = [
        'email' => 'required|email',
        'password' => 'required|string',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $identifier = hash('sha256', $input['email'] . '|' . $ip);
    checkLoginThrottle($identifier, $ip);

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    // Timing-safe rejection: suspended accounts must not reveal that the
    // supplied password was correct. Verify against a dummy hash and return
    // the same generic error as invalid credentials.
    if (!$user || $user['status'] === 'suspended') {
        password_verify($input['password'], '$2y$10$4FrJfiv9g9MkEFLjKr2Ryub6iQ05bT/DMxo/bfMKVmXhJt7l5aJ2.');
        recordLoginAttempt($identifier, $ip, false);
        error('Invalid credentials', 401);
    }

    if (!password_verify($input['password'], $user['password'])) {
        recordLoginAttempt($identifier, $ip, false);
        error('Invalid credentials', 401);
    }

    // Enforce email verification only when SMTP is actually configured,
    // otherwise users could never receive the verification email and would be locked out.
    if (REQUIRE_EMAIL_VERIFICATION && emailsConfigured() && empty($user['email_verified_at'])) {
        error('You must verify your email before logging in', 403, ['code' => 'email_not_verified', 'email' => $user['email']]);
    }

    recordLoginAttempt($identifier, $ip, true);

    $role = $user['role'] ?? 'client';

    $token = generateJWT(['sub' => (int)$user['id'], 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
    $refreshToken = generateRefreshToken((int)$user['id']);

    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $parsed = parseUserAgent($ua);
    $db->prepare("INSERT INTO login_sessions (user_id, device_type, device_name, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)")
        ->execute([(int)$user['id'], $parsed['device_type'], $parsed['device_name'], $ip, $ua]);

    $sessionId = (int)$db->lastInsertId();
    $maxSessions = 3;
    $db->prepare("
        DELETE FROM login_sessions
        WHERE user_id = ? AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM login_sessions WHERE user_id = ? ORDER BY last_active DESC LIMIT ?
            ) AS keep
        )
    ")->execute([(int)$user['id'], (int)$user['id'], $maxSessions]);

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
    ], 'Login successful');
}

function getCurrentUser(): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id, first_name, last_name, email, role, fitness_level, primary_goal, training_days, photo, status, created_at FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        error('User not found', 404);
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
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    if (!$stmt->fetch()) {
        // Generic response to avoid user enumeration
        success(null, 'If the email exists, you will receive a recovery code');
        return;
    }

    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600);

    // Store only a hash of the token so a DB leak cannot be used to reset passwords.
    $stmt = $db->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$input['email'], hash('sha256', $token), $expires]);

    $sent = false;
    try {
        if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
            require_once __DIR__ . '/../../helpers/mailer.php';
            $sent = sendPasswordResetEmail($input['email'], $token);
        }
    } catch (\Throwable $e) {
        error_log('Password reset email failed: ' . $e->getMessage());
    }

    if (!$sent) {
        error_log('Password reset email could not be sent for: ' . $input['email']);
    }

    // Generic response; never return the token in the API response.
    success(null, 'If the email exists, you will receive a recovery code');
}

function resetPassword(): void {
    $input = getJsonInput();

    $rules = [
        'token' => 'required|string',
        'password' => 'required|string|min:8|max:255',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    $token = trim($input['token']);
    if (strlen($token) > 200) {
        error('Invalid or expired token', 400);
    }
    $tokenHash = hash('sha256', $token);

    // Accept hashed tokens (new) and legacy plaintext tokens stored by older versions.
    $stmt = $db->prepare("SELECT * FROM password_resets WHERE (token = ? OR token = ?) AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$tokenHash, $token]);
    $reset = $stmt->fetch();

    if (!$reset) {
        error('Invalid or expired token', 400);
    }

    $hashedPassword = password_hash($input['password'], PASSWORD_BCRYPT);

    $db->prepare("UPDATE users SET password = ?, token_version = token_version + 1 WHERE email = ?")
        ->execute([$hashedPassword, $reset['email']]);

    $db->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
        ->execute([$reset['id']]);

    // Invalidate refresh tokens and sessions for this account.
    $userStmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $userStmt->execute([$reset['email']]);
    $user = $userStmt->fetch();
    if ($user) {
        $db->prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")->execute([$user['id']]);
        try {
            $db->prepare("DELETE FROM login_sessions WHERE user_id = ?")->execute([$user['id']]);
        } catch (\PDOException $e) {}
    }

    success(null, 'Password updated successfully');
}

function googleLogin(): void {
    $input = getJsonInput();
    $rules = ['credential' => 'required|string'];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($input['credential']));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) error('Invalid Google token', 401);

    $google = json_decode($response, true);
    if (!$google || !isset($google['email'])) error('Could not verify the token', 401);

    $clientId = GOOGLE_CLIENT_ID;
    if ($clientId && ($google['aud'] ?? '') !== $clientId) error('Token not issued for this application', 401);

    $email = $google['email'];
    $firstName = $google['given_name'] ?? explode('@', $email)[0];
    $lastName = $google['family_name'] ?? '';

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') error('Account suspended', 403);
        $role = $user['role'] ?? 'client';
        $token = generateJWT(['sub' => (int)$user['id'], 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);
        $refreshToken = generateRefreshToken((int)$user['id']);
        success([
            'token' => $token, 'refresh_token' => $refreshToken, 'csrf_token' => generateCsrfToken(),
            'needsPasswordSetup' => empty($user['password']),
            'user' => ['id' => (int)$user['id'], 'firstName' => $user['first_name'], 'lastName' => $user['last_name'], 'email' => $user['email'], 'role' => $role, 'photo' => $google['picture'] ?? $user['photo']],
        ], 'Login successful');
        return;
    }

    $db->prepare("INSERT INTO users (first_name, last_name, email, role, status, password, photo) VALUES (?, ?, ?, 'client', 'active', '', ?)")
        ->execute([$firstName, $lastName, $email, $google['picture'] ?? null]);
    $userId = (int)$db->lastInsertId();

    $token = generateJWT(['sub' => $userId, 'role' => 'client', 'tv' => 0]);
    $refreshToken = generateRefreshToken($userId);

    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($userId, 'signup', 'Welcome to FitPower (Google)', 'UserPlus', '#10b981', 'New', 'bg-success');

    success([
        'token' => $token, 'refresh_token' => $refreshToken, 'csrf_token' => generateCsrfToken(),
        'needsPasswordSetup' => true,
        'user' => ['id' => $userId, 'firstName' => $firstName, 'lastName' => $lastName, 'email' => $email, 'role' => 'client', 'photo' => $google['picture'] ?? null],
    ], 'Registration successful', 201);
}

function setPassword(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['password' => 'required|string|min:8|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();
    $hashed = password_hash($input['password'], PASSWORD_BCRYPT);
    $db->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hashed, $auth['sub']]);
    success(null, 'Password set successfully');
}

function googleRedirect(): void {
    if (session_status() === PHP_SESSION_NONE) {
        ensureSessionHardened();
        session_start();
    }
    $clientId = GOOGLE_CLIENT_ID;
    if (!$clientId) error('Google Client ID not configured', 500);

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
    if (session_status() === PHP_SESSION_NONE) {
        ensureSessionHardened();
        session_start();
    }
    $input = getJsonInput();
    $code = $input['code'] ?? '';
    $state = $input['state'] ?? '';

    if (!$code) error('Authorization code required', 400);
    if (!$state || $state !== ($_SESSION['google_oauth_state'] ?? '')) error('Invalid state', 400);
    unset($_SESSION['google_oauth_state']);

    $clientId = GOOGLE_CLIENT_ID;
    $clientSecret = GOOGLE_CLIENT_SECRET;
    if (!$clientId) error('Google Client ID not configured', 500);

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

    if ($httpCode !== 200) error('Error exchanging code with Google', 401);
    $tokenData = json_decode($tokenResponse, true);
    $accessToken = $tokenData['access_token'] ?? '';
    if (!$accessToken) error('Could not get access token', 401);

    $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $userResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) error('Could not get user information', 401);
    $googleUser = json_decode($userResponse, true);
    if (!$googleUser || !isset($googleUser['email'])) error('Could not get user email', 401);

    $email = $googleUser['email'];
    $firstName = $googleUser['given_name'] ?? explode('@', $email)[0];
    $lastName = $googleUser['family_name'] ?? '';
    $picture = $googleUser['picture'] ?? null;

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') error('Account suspended', 403);
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
    if (session_status() === PHP_SESSION_NONE) {
        ensureSessionHardened();
        session_start();
    }
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

    // Tokens go in the URL fragment so they never hit server logs, browser
    // history entries or Referer headers. The SPA reads them via
    // window.location.hash and immediately navigates to a clean URL.
    $frontendUrl = $loginUrl . '#token=' . urlencode($jwt) . '&refresh_token=' . urlencode($refreshToken);
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
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();
    $db->prepare("UPDATE users SET fcm_token = ? WHERE id = ?")
        ->execute([$input['fcm_token'], $auth['sub']]);
    success(null, 'FCM token saved');
}

function revokeAllSessions(): void {
    $auth = requireAuth();
    $db = getDB();
    $db->prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?")->execute([$auth['sub']]);
    $db->prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")->execute([$auth['sub']]);
    $db->prepare("DELETE FROM login_sessions WHERE user_id = ?")->execute([$auth['sub']]);
    success(null, 'All sessions have been revoked');
}

function getSessionsByEmail(): void {
    $input = getJsonInput();
    $errors = validate($input, ['email' => 'required|email']);
    if ($errors) error('Validation error', 422, $errors);

    // Strict per-endpoint rate limit: this endpoint is a user-enumeration
    // vector, so unauthenticated probing is throttled hard.
    rateLimit(5);

    // Enumeration protection: only reveal sessions to the authenticated
    // owner of the email. Unauthenticated or foreign callers always get the
    // same generic (empty) response.
    $auth = tryAuth();
    if (!$auth) {
        success(['sessions' => [], 'role' => null]);
        return;
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, role, email FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    if (!$user || (int)$user['id'] !== (int)$auth['sub']) {
        success(['sessions' => [], 'role' => null]);
        return;
    }

    $userId = (int)$user['id'];
    $role = $user['role'] ?? 'client';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmt = $db->prepare("
        SELECT id, device_type, device_name, ip_address, last_active, created_at
        FROM login_sessions
        WHERE user_id = ? AND (ip_address != ? OR user_agent != ?)
        ORDER BY last_active DESC
        LIMIT 10
    ");
    $stmt->execute([$userId, $ip, $ua]);
    $sessions = array_map(function($s) {
        $now = time();
        $lastActive = strtotime($s['last_active']);
        $diffMinutes = (int)(($now - $lastActive) / 60);
        $timeAgo = $diffMinutes < 1 ? 'Active now'
            : ($diffMinutes < 60 ? "$diffMinutes min ago"
            : ($diffMinutes < 1440 ? intdiv($diffMinutes, 60) . "h ago"
            : intdiv($diffMinutes, 1440) . "d ago"));
        return [
            'id' => (int)$s['id'],
            'deviceType' => $s['device_type'],
            'deviceName' => $s['device_name'],
            'lastActive' => $s['last_active'],
            'timeAgo' => $timeAgo,
        ];
    }, $stmt->fetchAll());

    success(['sessions' => $sessions, 'role' => $role]);
}

function logoutUser(): void {
    $auth = requireAuth();
    $db = getDB();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $db->prepare("DELETE FROM login_sessions WHERE user_id = ? AND ip_address = ? AND user_agent = ?")
        ->execute([(int)$auth['sub'], $ip, $ua]);

    $db->prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")
        ->execute([(int)$auth['sub']]);

    success(null, 'Logged out successfully');
}

function publicStats(): void {
    $db = getDB();

    $workouts = (int)$db->query("SELECT COUNT(*) FROM session_participants WHERE status = 'completed'")->fetchColumn();
    $trainers = (int)$db->query("SELECT COUNT(*) FROM trainers WHERE status = 'approved'")->fetchColumn();
    $clients = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'client'")->fetchColumn();

    success([
        'workouts' => $workouts,
        'trainers' => $trainers,
        'clients' => $clients,
    ]);
}
