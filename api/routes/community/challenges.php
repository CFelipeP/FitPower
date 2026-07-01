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

    $chStmt = $db->prepare("SELECT title FROM challenges WHERE id = ?");
    $chStmt->execute([$challengeId]);
    $chTitle = $chStmt->fetchColumn();
    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($auth['sub'], 'challenge', 'Te has unido al desafío: ' . $chTitle, 'Trophy', '#f59e0b', 'New', 'bg-warning');

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

function createChallenge(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $rules = [
        'title' => 'required|string|min:3|max:255',
        'description' => 'string|max:5000',
        'goalType' => 'required|in:workouts,minutes,weight,custom',
        'goalValue' => 'required|numeric|min_value:1',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO challenges (title, description, goal_type, goal_value, start_date, end_date, is_featured, max_participants, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['title'],
        $input['description'] ?? null,
        $input['goalType'],
        (int)$input['goalValue'],
        $input['startDate'] ?? null,
        $input['endDate'] ?? null,
        isset($input['isFeatured']) ? (int)$input['isFeatured'] : 0,
        isset($input['maxParticipants']) ? (int)$input['maxParticipants'] : null,
        $input['status'] ?? 'active',
        $auth['sub'],
    ]);
    $id = (int)$db->lastInsertId();
    logAdminAction($auth['sub'], 'create', 'challenge', $id);
    success(['id' => $id], 'Challenge creado', 201);
}

function updateChallenge(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM challenges WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Challenge no encontrado', 404);
    $fieldMap = [
        'title' => 'title',
        'description' => 'description',
        'goalType' => 'goal_type',
        'goalValue' => 'goal_value',
        'startDate' => 'start_date',
        'endDate' => 'end_date',
        'isFeatured' => 'is_featured',
        'maxParticipants' => 'max_participants',
        'status' => 'status',
    ];
    $updates = [];
    $params = [];
    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }
    if (empty($updates)) error('No hay campos para actualizar', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE challenges SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    logAdminAction($auth['sub'], 'update', 'challenge', (int)$id);
    success(null, 'Challenge actualizado');
}

function deleteChallenge(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM challenges WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Challenge no encontrado', 404);
    $db->prepare("DELETE FROM challenge_participants WHERE challenge_id = ?")->execute([(int)$id]);
    $db->prepare("DELETE FROM challenges WHERE id = ?")->execute([(int)$id]);
    logAdminAction($auth['sub'], 'delete', 'challenge', (int)$id);
    success(null, 'Challenge eliminado');
}
