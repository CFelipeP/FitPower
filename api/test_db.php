<?php
try {
    $pdo = new PDO("mysql:host=localhost;port=3306;dbname=fitpower;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "DB_OK\n";
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM programs");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "PROGRAMS: " . $row['cnt'] . "\n";
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM subscription_plans");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "PLANS: " . $row['cnt'] . "\n";
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM leaderboard_entries");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "LEADERBOARD: " . $row['cnt'] . "\n";

    $stmt = $pdo->query("SHOW TABLES");
    echo "TABLES:\n";
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        echo "  - " . $row[0] . "\n";
    }
} catch (Exception $e) {
    echo "DB_ERROR: " . $e->getMessage() . "\n";
}
