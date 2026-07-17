<?php
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');
echo "Running migrations...\n\n";

$dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
$db = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
]);

$migrationsDir = __DIR__ . '/database/migrations';

$s = $db->query("CREATE TABLE IF NOT EXISTS migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL UNIQUE,
    batch INT UNSIGNED NOT NULL DEFAULT 1,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$s->closeCursor();

$s = $db->query("SELECT migration FROM migrations");
$ranMigrations = $s->fetchAll(PDO::FETCH_COLUMN);
$s->closeCursor();

$s = $db->query("SELECT COALESCE(MAX(batch), 0) FROM migrations");
$newBatch = (int)$s->fetchColumn() + 1;
$s->closeCursor();

$files = glob($migrationsDir . '/*.sql');
sort($files);

$migrationCount = 0;

foreach ($files as $file) {
    $name = basename($file);

    if (in_array($name, $ranMigrations)) {
        echo "SKIP (already run): $name\n";
        continue;
    }

    echo "Running: $name ... ";
    try {
        $sql = file_get_contents($file);
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $_stmt) {
            if (empty($_stmt)) continue;
            try {
                $s = $db->query($_stmt);
                $s->closeCursor();
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists') || str_contains($e->getMessage(), 'Duplicate key name')) {
                    continue;
                }
                throw $e;
            }
        }

        $db->prepare("INSERT INTO migrations (migration, batch) VALUES (?, ?)")
            ->execute([$name, $newBatch]);
        $migrationCount++;
        echo "OK\n";
    } catch (Exception $e) {
        if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists') || str_contains($e->getMessage(), 'Duplicate key name')) {
            try {
                $db->prepare("INSERT INTO migrations (migration, batch) VALUES (?, ?)")
                    ->execute([$name, $newBatch]);
                $migrationCount++;
                echo "OK (existing objects)\n";
            } catch (Exception $inner) {
                echo "ERROR: " . $inner->getMessage() . "\n";
            }
        } else {
            echo "ERROR: " . $e->getMessage() . "\n";
        }
    }
}

echo "\nDone! ($migrationCount new migration" . ($migrationCount !== 1 ? 's' : '') . ")\n";
