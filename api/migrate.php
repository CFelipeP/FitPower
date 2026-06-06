<?php
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');
echo "Running migrations...\n\n";

$db = getDB();
$migrationsDir = __DIR__ . '/database/migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

foreach ($files as $file) {
    $name = basename($file);
    echo "Running: $name ... ";
    try {
        $sql = file_get_contents($file);
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $stmt) {
            if (!empty($stmt)) {
                $db->exec($stmt);
            }
        }
        echo "OK\n";
    } catch (Exception $e) {
        if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists')) {
            echo "SKIP (already applied)\n";
        } else {
            echo "ERROR: " . $e->getMessage() . "\n";
        }
    }
}

echo "\nDone!\n";
