<?php

function generateJWT(array $payload): string {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = $payload['iat'] ?? time();
    $payload['exp'] = $payload['exp'] ?? time() + JWT_EXPIRY;
    $payload['tv'] = $payload['tv'] ?? 0;
    $payloadEncoded = base64url_encode(json_encode($payload));
    $signature = base64url_encode(
        hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true)
    );
    return "$header.$payloadEncoded.$signature";
}

function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $expectedSig = base64url_encode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64url_decode($payload), true);
    if (!$data) return null;

    // Support legacy tokens without exp
    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
}

function getUserById(int $id): ?array {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function requireAuth(): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        error('Token de autenticación requerido', 401);
    }

    $payload = verifyJWT($matches[1]);
    if (!$payload) {
        error('Token inválido o expirado', 401);
    }

    if (isset($payload['tv'])) {
        $db = getDB();
        $stmt = $db->prepare("SELECT token_version FROM users WHERE id = ?");
        $stmt->execute([$payload['sub']]);
        $user = $stmt->fetch();
        if (!$user || (int)$user['token_version'] !== (int)$payload['tv']) {
            error('Sesión revocada. Inicia sesión de nuevo.', 401);
        }
    }

    return $payload;
}

function requireRole(string ...$roles): array {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', $roles)) {
        error('No tienes permisos para acceder a este recurso', 403);
    }
    return $auth;
}

function tryAuth(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) return null;
    return verifyJWT($matches[1]);
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateRefreshToken(int $userId): string {
    try {
        $db = getDB();
        $token = bin2hex(random_bytes(64));
        $expiresAt = date('Y-m-d H:i:s', time() + REFRESH_TOKEN_EXPIRY);

        $stmt = $db->prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $token, $expiresAt]);

        return $token;
    } catch (\PDOException $e) {
        return '';
    }
}

function refreshAccessToken(string $refreshToken): ?array {
    try {
        $db = getDB();

        $stmt = $db->prepare("SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > NOW()");
        $stmt->execute([$refreshToken]);
        $row = $stmt->fetch();

        if (!$row) return null;

        $user = getUserById((int)$row['user_id']);
        if (!$user) return null;

        $db->prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?")->execute([$row['id']]);

        $role = $user['role'] ?? 'client';
        $newAccessToken = generateJWT(['sub' => (int)$user['id'], 'role' => $role, 'tv' => (int)($user['token_version'] ?? 0)]);

        $newRefreshToken = generateRefreshToken((int)$user['id']);

        return [
            'token' => $newAccessToken,
            'refresh_token' => $newRefreshToken,
            'user' => [
                'id' => (int)$user['id'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'email' => $user['email'],
                'role' => $role,
                'fitnessLevel' => $user['fitness_level'] ?? null,
                'primaryGoal' => $user['primary_goal'] ?? null,
                'photo' => $user['photo'] ?? null,
            ],
        ];
    } catch (\PDOException $e) {
        return null;
    }
}
