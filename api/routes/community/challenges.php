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

function adminListChallenges(): void {
    requireRole('admin');
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
    foreach ($challenges as &$ch) {
        $ch['participant_count'] = (int)$ch['participant_count'];
    }
    unset($ch);
    success($challenges);
}

function joinChallenge(int $challengeId): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id, max_participants, status FROM challenges WHERE id = ?");
    $stmt->execute([$challengeId]);
    $challenge = $stmt->fetch();

    if (!$challenge) error('Challenge not found', 404);
    if ($challenge['status'] !== 'active' && $challenge['status'] !== 'upcoming') {
        error('This challenge is not available to join', 400);
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = ?");
    $countStmt->execute([$challengeId]);
    $currentCount = (int)$countStmt->fetchColumn();

    if ($challenge['max_participants'] && $currentCount >= $challenge['max_participants']) {
        error('The challenge has reached the maximum number of participants', 400);
    }

    $checkStmt = $db->prepare("SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?");
    $checkStmt->execute([$challengeId, $auth['sub']]);
    if ($checkStmt->fetch()) error('You are already enrolled in this challenge', 400);

    $db->prepare("INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)")
        ->execute([$challengeId, $auth['sub']]);

    updateLeaderboardPoints($auth['sub'], 'forum_posts', 10);

    $chStmt = $db->prepare("SELECT title FROM challenges WHERE id = ?");
    $chStmt->execute([$challengeId]);
    $chTitle = $chStmt->fetchColumn();
    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($auth['sub'], 'challenge', 'You joined the challenge: ' . $chTitle, 'Trophy', '#f59e0b', 'New', 'bg-warning');

    success(null, 'You joined the challenge', 201);
}

function leaveChallenge(int $challengeId): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?");
    $stmt->execute([$challengeId, $auth['sub']]);
    if (!$stmt->fetch()) error('You are not enrolled in this challenge', 400);

    $db->prepare("DELETE FROM challenge_participants WHERE challenge_id = ? AND user_id = ?")
        ->execute([$challengeId, $auth['sub']]);

    success(null, 'You left the challenge');
}

function updateProgress(int $challengeId, int $userId, array $data): void {
    $auth = requireAuth();
    $db = getDB();

    if ($auth['sub'] != $userId) {
        $roleStmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $roleStmt->execute([$auth['sub']]);
        $user = $roleStmt->fetch();
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'coach')) {
            error('You do not have permission to update another user\'s progress', 403);
        }
    }

    $chkStmt = $db->prepare("SELECT cp.id, c.goal_value FROM challenge_participants cp JOIN challenges c ON c.id = cp.challenge_id WHERE cp.challenge_id = ? AND cp.user_id = ?");
    $chkStmt->execute([$challengeId, $userId]);
    $row = $chkStmt->fetch();
    if (!$row) error('Participation not found', 404);

    $progress = max(0, (int)($data['progress'] ?? 0));
    $goalValue = (int)$row['goal_value'];

    $db->prepare("UPDATE challenge_participants SET progress = ?, completed_at = CASE WHEN ? >= ? AND ? > 0 THEN NOW() ELSE NULL END WHERE challenge_id = ? AND user_id = ?")
        ->execute([$progress, $progress, $goalValue, $goalValue, $challengeId, $userId]);

    success(null, 'Progress updated');
}

function createChallenge(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $rules = [
        'title' => 'required|string|min:3|max:255',
        'description' => 'string|max:5000',
        'category' => 'in:strength,cardio,nutrition,mindset,habit',
        'goalType' => 'required|in:reps,minutes,days,distance,weight,custom',
        'goalValue' => 'required|numeric|min_value:1|max_value:999999999',
        'startDate' => 'date',
        'endDate' => 'date',
        'status' => 'in:active,upcoming,completed,cancelled',
        'maxParticipants' => 'numeric|min_value:1|max_value:1000000',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO challenges (title, description, category, goal_type, goal_value, start_date, end_date, is_featured, max_participants, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['title'],
        $input['description'] ?? null,
        $input['category'] ?? 'strength',
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
    success(['id' => $id], 'Challenge created', 201);
}

function updateChallenge(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM challenges WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Challenge not found', 404);

    $rules = [];
    if (isset($input['title'])) $rules['title'] = 'string|min:3|max:255';
    if (isset($input['description'])) $rules['description'] = 'string|max:5000';
    if (isset($input['goalType'])) $rules['goalType'] = 'in:reps,minutes,days,distance,weight,custom';
    if (isset($input['goalValue'])) $rules['goalValue'] = 'numeric|min_value:1|max_value:999999999';
    if (isset($input['startDate'])) $rules['startDate'] = 'date';
    if (isset($input['endDate'])) $rules['endDate'] = 'date';
    if (isset($input['status'])) $rules['status'] = 'in:active,upcoming,completed,cancelled';
    if (isset($input['maxParticipants'])) $rules['maxParticipants'] = 'numeric|min_value:1|max_value:1000000';
    if (isset($input['isFeatured'])) $rules['isFeatured'] = 'boolean';
    if ($rules) {
        $errors = validate($input, $rules);
        if ($errors) error('Validation error', 422, $errors);
    }

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
            $params[] = $inputKey === 'isFeatured' ? (int)$input[$inputKey] : $input[$inputKey];
        }
    }
    if (empty($updates)) error('No fields to update', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE challenges SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    logAdminAction($auth['sub'], 'update', 'challenge', (int)$id);
    success(null, 'Challenge updated');
}

function deleteChallenge(string $id): void {
    $auth = requireRole('admin');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM challenges WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Challenge not found', 404);
    $db->prepare("DELETE FROM challenge_participants WHERE challenge_id = ?")->execute([(int)$id]);
    $db->prepare("DELETE FROM challenges WHERE id = ?")->execute([(int)$id]);
    logAdminAction($auth['sub'], 'delete', 'challenge', (int)$id);
    success(null, 'Challenge deleted');
}
