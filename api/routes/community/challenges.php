<?php

function listChallenges(): void {
    $auth = tryAuth();
    $db = getDB();

    $stmt = $db->query("
        SELECT c.*,
               CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
               (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count
        FROM challenges c
        LEFT JOIN users u ON u.id = c.created_by
        ORDER BY c.is_featured DESC, c.created_at DESC
    ");
    $challenges = $stmt->fetchAll();

    if ($auth) {
        $cpStmt = $db->prepare("SELECT challenge_id, progress FROM challenge_participants WHERE user_id = ?");
        $cpStmt->execute([$auth['sub']]);
        $userChallenges = [];
        foreach ($cpStmt->fetchAll() as $row) {
            $userChallenges[(int)$row['challenge_id']] = (int)$row['progress'];
        }
        foreach ($challenges as &$ch) {
            $ch['joined'] = isset($userChallenges[(int)$ch['id']]);
            $ch['user_progress'] = $userChallenges[(int)$ch['id']] ?? 0;
        }
        unset($ch);
    } else {
        $filtered = array_filter($challenges, fn($c) => $c['is_featured']);
        $challenges = array_values($filtered);
    }

    success($challenges);
}

function joinChallenge(int $challengeId): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id, max_participants, status FROM challenges WHERE id = ?");
    $stmt->execute([$challengeId]);
    $challenge = $stmt->fetch();

    if (!$challenge) error('Challenge no encontrado', 404);
    if ($challenge['status'] !== 'active' && $challenge['status'] !== 'upcoming') {
        error('Este challenge no está disponible para unirse', 400);
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = ?");
    $countStmt->execute([$challengeId]);
    $currentCount = (int)$countStmt->fetchColumn();

    if ($challenge['max_participants'] && $currentCount >= $challenge['max_participants']) {
        error('El challenge ha alcanzado el máximo de participantes', 400);
    }

    $checkStmt = $db->prepare("SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?");
    $checkStmt->execute([$challengeId, $auth['sub']]);
    if ($checkStmt->fetch()) error('Ya estás inscrito en este challenge', 400);

    $db->prepare("INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)")
        ->execute([$challengeId, $auth['sub']]);

    updateLeaderboardPoints($auth['sub'], 'forum_posts', 10);

    success(null, 'Te has unido al challenge', 201);
}

function leaveChallenge(int $challengeId): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?");
    $stmt->execute([$challengeId, $auth['sub']]);
    if (!$stmt->fetch()) error('No estás inscrito en este challenge', 400);

    $db->prepare("DELETE FROM challenge_participants WHERE challenge_id = ? AND user_id = ?")
        ->execute([$challengeId, $auth['sub']]);

    success(null, 'Has salido del challenge');
}

function updateProgress(int $challengeId, int $userId, array $data): void {
    $auth = requireAuth();
    $db = getDB();

    if ($auth['sub'] != $userId) {
        $roleStmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $roleStmt->execute([$auth['sub']]);
        $user = $roleStmt->fetch();
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'coach')) {
            error('No tienes permisos para actualizar el progreso de otro usuario', 403);
        }
    }

    $chkStmt = $db->prepare("SELECT cp.id, c.goal_value FROM challenge_participants cp JOIN challenges c ON c.id = cp.challenge_id WHERE cp.challenge_id = ? AND cp.user_id = ?");
    $chkStmt->execute([$challengeId, $userId]);
    $row = $chkStmt->fetch();
    if (!$row) error('Participación no encontrada', 404);

    $progress = max(0, (int)($data['progress'] ?? 0));
    $goalValue = (int)$row['goal_value'];

    $db->prepare("UPDATE challenge_participants SET progress = ?, completed_at = CASE WHEN ? >= ? AND ? > 0 THEN NOW() ELSE NULL END WHERE challenge_id = ? AND user_id = ?")
        ->execute([$progress, $progress, $goalValue, $goalValue, $challengeId, $userId]);

    success(null, 'Progreso actualizado');
}
