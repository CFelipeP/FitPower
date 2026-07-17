<?php
$passwords = ['', 'root', 'fitpower'];
foreach ($passwords as $pass) {
    try {
        $pdo = new PDO("mysql:host=localhost;port=3306;charset=utf8mb4", "root", $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        echo "ROOT CONNECTED with pass='$pass'\n";
        $stmt = $pdo->query("SHOW DATABASES LIKE 'fitpower'");
        if ($stmt->fetch()) {
            echo "Database 'fitpower' exists\n";
        } else {
            echo "Database 'fitpower' MISSING\n";
        }
        exit;
    } catch (Exception $e) {
        echo "ROOT pass='$pass': " . $e->getMessage() . "\n";
    }
}
