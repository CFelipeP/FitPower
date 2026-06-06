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

define('JWT_SECRET', getenv('JWT_SECRET') ?: 'fitpower_secret_key_change_in_production_2026');
define('JWT_EXPIRY', 86400 * 7);

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

define('UPLOAD_DIR', __DIR__ . '/uploads');
define('API_BASE', '/api');

define('RATE_LIMIT_MAX', 60);
define('RATE_LIMIT_WINDOW', 60);

function rateLimit(): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $endpoint = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $db = getDB();

        $stmt = $db->prepare("SELECT hits, window_start FROM rate_limits WHERE ip_address = ? AND endpoint = ? AND window_start > DATE_SUB(NOW(), INTERVAL ? SECOND)");
        $stmt->execute([$ip, $endpoint, RATE_LIMIT_WINDOW]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ((int)$existing['hits'] >= RATE_LIMIT_MAX) {
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

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}
