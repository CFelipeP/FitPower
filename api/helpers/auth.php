<?php

function generateJWT(array $payload): string {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = $payload['iat'] ?? time();
    $payload['exp'] = $payload['exp'] ?? time() + JWT_EXPIRY;
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
