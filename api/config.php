<?php

$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        putenv(trim($line));
    }
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'fitpower');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// IMPORTANT: Change JWT_SECRET to a random 32+ char string in production via .env
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'fitpower_secret_key_change_in_production_2026');
define('JWT_EXPIRY', (int)(getenv('JWT_EXPIRY') ?: 86400 * 7));
define('REFRESH_TOKEN_EXPIRY', (int)(getenv('REFRESH_TOKEN_EXPIRY') ?: 86400 * 30));

define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: '587');
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: 'noreply@fitpower.app');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'FitPower');
define('APP_URL', getenv('APP_URL') ?: 'http://localhost:5177');

define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: '');
define('STRIPE_PUBLISHABLE_KEY', getenv('STRIPE_PUBLISHABLE_KEY') ?: '');
define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET') ?: '');

define('PAYPAL_CLIENT_ID', getenv('PAYPAL_CLIENT_ID') ?: '');
define('PAYPAL_CLIENT_SECRET', getenv('PAYPAL_CLIENT_SECRET') ?: '');
define('PAYPAL_WEBHOOK_ID', getenv('PAYPAL_WEBHOOK_ID') ?: '');
define('PAYPAL_API_BASE', getenv('PAYPAL_API_BASE') ?: 'https://api-m.sandbox.paypal.com');

define('UPLOAD_DIR', __DIR__ . '/uploads');
define('API_BASE', '/api');

define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '');

define('RATE_LIMIT_MAX', 60);
define('RATE_LIMIT_WINDOW', 60);

function rateLimit(int $customMax = 0): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $endpoint = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $db = getDB();

        // Stricter limits for sensitive auth endpoints
        $max = $customMax > 0 ? $customMax : RATE_LIMIT_MAX;
        if (preg_match('#/auth/(login|forgot|reset|register)#', $endpoint)) {
            $max = 10;
        }

        $stmt = $db->prepare("SELECT hits, window_start FROM rate_limits WHERE ip_address = ? AND endpoint = ? AND window_start > DATE_SUB(NOW(), INTERVAL ? SECOND)");
        $stmt->execute([$ip, $endpoint, RATE_LIMIT_WINDOW]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ((int)$existing['hits'] >= $max) {
                error('Demasiadas solicitudes. Intenta de nuevo en un minuto.', 429);
            }
            $db->prepare("UPDATE rate_limits SET hits = hits + 1 WHERE ip_address = ? AND endpoint = ? AND window_start = ?")
                ->execute([$ip, $endpoint, $existing['window_start']]);
        } else {
            $db->prepare("INSERT INTO rate_limits (ip_address, endpoint, window_start, hits) VALUES (?, ?, NOW(), 1)")
                ->execute([$ip, $endpoint]);
        }

        // Cleanup old entries
        $db->exec("DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    } catch (\PDOException $e) {
        // Table might not exist — skip rate limiting silently
    }
}

function generateCsrfToken(): string {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_time'] = time();
    return $token;
}

function validateCsrfToken(string $token): bool {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $stored = $_SESSION['csrf_token'] ?? '';
    $storedTime = $_SESSION['csrf_token_time'] ?? 0;
    if (empty($stored) || time() - $storedTime > 7200) {
        return false;
    }
    return hash_equals($stored, $token);
}

function requireCsrf(): void {
    $method = $_SERVER['REQUEST_METHOD'];
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'])) {
        return;
    }
    // Skip CSRF for public auth endpoints
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/auth/#', $uri)) {
        return;
    }
    // Webhooks come from external payment providers without CSRF tokens
    if (preg_match('#/webhook#', $uri)) {
        return;
    }
    // Skip CSRF when a valid JWT is present — the bearer token can't be forged
    // cross-origin, making CSRF redundant for this SPA.
    if (tryAuth() !== null) {
        return;
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['_csrf'] ?? '');
    if (!$token || !validateCsrfToken($token)) {
        error('CSRF token inválido o expirado', 403);
    }
}

define('LOGIN_MAX_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_MINUTES', 15);
define('LOGIN_IP_MAX_ATTEMPTS', 20);
define('LOGIN_IP_LOCKOUT_MINUTES', 30);

function checkLoginThrottle(string $identifier, string $ip): void {
    try {
        $db = getDB();
        $ipIdentifier = 'ip:' . $ip;

        // Check IP-based throttle
        $stmt = $db->prepare("SELECT attempts, locked_until FROM login_throttle WHERE identifier = ?");
        $stmt->execute([$ipIdentifier]);
        $ipRow = $stmt->fetch();
        if ($ipRow && $ipRow['locked_until'] && strtotime($ipRow['locked_until']) > time()) {
            $remaining = ceil((strtotime($ipRow['locked_until']) - time()) / 60);
            error("Demasiados intentos desde esta IP. Espera {$remaining} minutos.", 429);
        }

        // Check email+IP based throttle
        $stmt = $db->prepare("SELECT attempts, locked_until FROM login_throttle WHERE identifier = ?");
        $stmt->execute([$identifier]);
        $row = $stmt->fetch();
        if ($row && $row['locked_until'] && strtotime($row['locked_until']) > time()) {
            $remaining = ceil((strtotime($row['locked_until']) - time()) / 60);
            error("Demasiados intentos. Espera {$remaining} minutos.", 429);
        }
    } catch (\PDOException $e) {
    }
}

function recordLoginAttempt(string $identifier, string $ip, bool $success): void {
    try {
        $db = getDB();
        $ipIdentifier = 'ip:' . $ip;
        if ($success) {
            $db->prepare("DELETE FROM login_throttle WHERE identifier = ?")->execute([$identifier]);
            $db->prepare("DELETE FROM login_throttle WHERE identifier = ?")->execute([$ipIdentifier]);
            return;
        }
        // Record email+IP attempt
        $stmt = $db->prepare("INSERT INTO login_throttle (identifier, attempts, locked_until) VALUES (?, 1, NULL) ON DUPLICATE KEY UPDATE attempts = attempts + 1, locked_until = IF(attempts + 1 >= " . LOGIN_MAX_ATTEMPTS . ", DATE_ADD(NOW(), INTERVAL " . LOGIN_LOCKOUT_MINUTES . " MINUTE), NULL)");
        $stmt->execute([$identifier]);

        // Record IP-only attempt
        $stmt = $db->prepare("INSERT INTO login_throttle (identifier, attempts, locked_until) VALUES (?, 1, NULL) ON DUPLICATE KEY UPDATE attempts = attempts + 1, locked_until = IF(attempts + 1 >= " . LOGIN_IP_MAX_ATTEMPTS . ", DATE_ADD(NOW(), INTERVAL " . LOGIN_IP_LOCKOUT_MINUTES . " MINUTE), NULL)");
        $stmt->execute([$ipIdentifier]);
    } catch (\PDOException $e) {
    }
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => true,
        ]);
    }
    return $pdo;
}

function getAllowedOrigins(): array {
    return [
        'http://localhost:5177',
        'http://localhost:8080',
        APP_URL,
        'https://192.168.0.44',
    ];
}

function sendSecurityHeaders(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';");
}

function logAdminAction(int $adminId, string $action, string $targetType, int $targetId, ?array $details = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$adminId, $action, $targetType, $targetId, $details ? json_encode($details) : null]);
    } catch (\PDOException $e) {}
}

function h(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
