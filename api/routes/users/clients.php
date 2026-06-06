<?php

function listCoachClients(): void {
    $auth = requireRole('coach', 'admin');
    $userId = $auth['sub'];
    $db = getDB();

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$userId]);
    $trainerId = $trainerStmt->fetchColumn();

    if (!$trainerId) {
        success(['clients' => []]);
        return;
    }

    $trainerId = (int)$trainerId;

    $stmt = $db->prepare("
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at, u.updated_at,
               sp.name as plan_name, up.progress, p.name as program_name
        FROM users u
        JOIN user_programs up ON up.user_id = u.id
        JOIN programs p ON p.id = up.program_id
        LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE p.trainer_id = ?
        ORDER BY u.first_name, u.last_name
    ");
    $stmt->execute([$trainerId]);
    $rows = $stmt->fetchAll();

    $clients = array_map(function($r) {
        $daysSince = (int)((time() - strtotime($r['updated_at'])) / 86400);
        $lastActive = $daysSince === 0 ? 'Today' : ($daysSince === 1 ? 'Yesterday' : "$daysSince days ago");

        return [
            'id' => (int)$r['id'],
            'name' => trim($r['first_name'] . ' ' . $r['last_name']),
            'email' => $r['email'],
            'tier' => $r['plan_name'] ?? 'Starter',
            'status' => ucfirst($r['status']),
            'lastActive' => $lastActive,
            'program' => $r['program_name'] ?? null,
            'progress' => $r['progress'] ? (float)$r['progress'] : null,
        ];
    }, $rows);

    success(['clients' => $clients]);
}

function getClientDetail(string $id): void {
    $auth = requireRole('coach', 'admin');
    $userId = $auth['sub'];
    $db = getDB();

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$userId]);
    $trainerId = $trainerStmt->fetchColumn();

    if (!$trainerId) {
        error('Perfil de entrenador no encontrado', 404);
    }

    $trainerId = (int)$trainerId;

    $stmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at, u.updated_at,
               u.fitness_level, u.primary_goal, u.training_days, u.photo,
               sp.name as plan_name, sp.price_monthly,
               up.progress, up.current_week, p.name as program_name
        FROM users u
        JOIN user_programs up ON up.user_id = u.id
        JOIN programs p ON p.id = up.program_id
        LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE u.id = ? AND p.trainer_id = ?
        LIMIT 1
    ");
    $stmt->execute([$id, $trainerId]);
    $row = $stmt->fetch();

    if (!$row) {
        error('Cliente no encontrado', 404);
    }

    $daysSince = (int)((time() - strtotime($row['updated_at'])) / 86400);
    $lastActive = $daysSince === 0 ? 'Today' : ($daysSince === 1 ? 'Yesterday' : "$daysSince days ago");

    success([
        'id' => (int)$row['id'],
        'name' => trim($row['first_name'] . ' ' . $row['last_name']),
        'email' => $row['email'],
        'tier' => $row['plan_name'] ?? 'Starter',
        'status' => ucfirst($row['status']),
        'lastActive' => $lastActive,
        'fitnessLevel' => $row['fitness_level'],
        'primaryGoal' => $row['primary_goal'],
        'trainingDays' => $row['training_days'],
        'photo' => $row['photo'],
        'program' => $row['program_name'],
        'progress' => $row['progress'] ? (float)$row['progress'] : null,
        'currentWeek' => $row['current_week'] ? (int)$row['current_week'] : null,
        'memberSince' => $row['created_at'],
    ]);
}
