<?php
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');
echo "Running migrations...\n\n";

$db = getDB();
$migrationsDir = __DIR__ . '/database/migrations';

$db->exec("CREATE TABLE IF NOT EXISTS migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL UNIQUE,
    batch INT UNSIGNED NOT NULL DEFAULT 1,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$ranStmt = $db->query("SELECT migration FROM migrations");
$ranMigrations = $ranStmt->fetchAll(PDO::FETCH_COLUMN);

$batchStmt = $db->query("SELECT MAX(batch) FROM migrations");
$maxBatch = (int)$batchStmt->fetchColumn();
$newBatch = $maxBatch + 1;

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
        $allOk = true;
        foreach ($statements as $stmt) {
            if (empty($stmt)) continue;
            try {
                $db->exec($stmt);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists')) {
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
        if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists')) {
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
