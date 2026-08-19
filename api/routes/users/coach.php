<?php

function getClientCheckins(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $days = min(90, max(1, (int)($_GET['days'] ?? 30)));
    $stmt = $db->prepare("SELECT * FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ?");
    $stmt->execute([$userId, $days]);
    $result = array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'date' => $r['checkin_date'],
            'mood' => $r['mood'],
            'sleepHours' => $r['sleep_hours'] ? (float)$r['sleep_hours'] : null,
            'energyLevel' => $r['energy_level'] ? (int)$r['energy_level'] : null,
            'notes' => $r['notes'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function getClientMetrics(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $stmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 30");
    $stmt->execute([$userId]);
    $result = array_map(function($m) {
        return [
            'date' => $m['log_date'],
            'weight' => $m['weight_kg'] ? (float)$m['weight_kg'] : null,
            'bodyFat' => $m['body_fat_pct'] ? (float)$m['body_fat_pct'] : null,
            'muscle' => $m['muscle_kg'] ? (float)$m['muscle_kg'] : null,
            'bmi' => $m['bmi'] ? (float)$m['bmi'] : null,
        ];
    }, $stmt->fetchAll());
    success($result);
}

function getClientPhotos(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $stmt = $db->prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC");
    $stmt->execute([$userId]);
    $result = array_map(function($p) {
        return [
            'id' => (int)$p['id'],
            'photoUrl' => $p['photo_url'],
            'photoType' => $p['photo_type'],
            'bodyWeight' => $p['body_weight'] ? (float)$p['body_weight'] : null,
            'notes' => $p['notes'],
            'takenAt' => $p['taken_at'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function getClientNutrition(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $date = $_GET['date'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? AND log_date = ?");
    $stmt->execute([$userId, $date]);
    $data = $stmt->fetch();
    if (!$data) {
        success(['date' => $date, 'message' => 'No data for this date']);
        return;
    }
    success([
        'date' => $data['log_date'],
        'target' => (int)$data['calories_target'],
        'consumed' => (int)$data['calories_consumed'],
        'protein' => ['current' => (float)$data['protein_current'], 'target' => (float)$data['protein_target']],
        'carbs' => ['current' => (float)$data['carbs_current'], 'target' => (float)$data['carbs_target']],
        'fat' => ['current' => (float)$data['fat_current'], 'target' => (float)$data['fat_target']],
        'waterGlasses' => (int)$data['water_glasses'],
        'mealChecked' => [
            (int)$data['breakfast_checked'],
            (int)$data['lunch_checked'],
            (int)$data['dinner_checked'],
            (int)$data['snack_checked'],
        ],
    ]);
}

function assignClientRoutine(string $id): void {
    $auth = requireRole('coach', 'admin');
    $input = getJsonInput();
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }

    // Legacy flow: assign an already-existing session by id.
    if (!empty($input['sessionId'])) {
        $rules = ['sessionId' => 'required|numeric'];
        $errors = validate($input, $rules);
        if ($errors) error('Validation error', 422, $errors);
        $stmt = $db->prepare("SELECT id, title FROM sessions WHERE id = ?");
        $stmt->execute([(int)$input['sessionId']]);
        $session = $stmt->fetch();
        if (!$session) error('Session not found', 404);
        $chk = $db->prepare("SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?");
        $chk->execute([$session['id'], $userId]);
        if ($chk->fetch()) error('The client already has this routine assigned', 409);
        $db->prepare("INSERT INTO session_participants (session_id, user_id, status) VALUES (?, ?, 'registered')")
            ->execute([$session['id'], $userId]);
        $db->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'routine', 'New routine assigned', ?)")
            ->execute([$userId, 'You have been assigned the routine: ' . $session['title']]);
        success(null, 'Routine assigned', 201);
        return;
    }

    // Full routine assignment: date + title + exercises. Creates a session
    // owned by the coach, linked to the client, that shows up in the client's
    // "next workout" and the coach's calendar.
    $rules = [
        'date' => 'required|date',
        'title' => 'required|string|min:1|max:255',
        'focusArea' => 'string|max:100',
        'duration' => 'numeric|min_value:1|max_value:600',
        'exercises' => 'array',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    $exercises = array_values(array_filter($input['exercises'] ?? [], function ($ex) {
        return is_array($ex) && !empty(trim((string)($ex['name'] ?? '')));
    }));
    if (empty($exercises)) {
        error('Add at least one exercise', 422);
    }

    $trainerId = null;
    if ($auth['role'] === 'coach') {
        $tStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
        $tStmt->execute([$auth['sub']]);
        $trainerId = $tStmt->fetchColumn();
        if (!$trainerId) error('Trainer profile not found', 404);
    }

    $startTime = null;
    if (!empty($input['duration'])) {
        $startTime = '09:00:00';
    }
    $endTime = null;
    if (!empty($input['duration']) && $startTime) {
        $end = new DateTime($startTime);
        $end->modify('+' . (int)$input['duration'] . ' minutes');
        $endTime = $end->format('H:i:s');
    }
    $focusArea = !empty($input['focusArea']) ? (string)$input['focusArea'] : null;
    $description = ($focusArea ? 'Focus: ' . ucfirst(str_replace('_', ' ', $focusArea)) . '. ' : '')
        . 'Custom routine assigned by your coach.';

    $db->beginTransaction();
    try {
        $db->prepare("
            INSERT INTO sessions (user_id, trainer_id, title, description, date, start_time, end_time, type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'strength', 'scheduled')
        ")->execute([$userId, $trainerId, $input['title'], $description, $input['date'], $startTime, $endTime]);
        $sessionId = (int)$db->lastInsertId();

        $exStmt = $db->prepare("
            INSERT INTO exercises (session_id, name, sets, reps, notes, sort_order, exercise_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($exercises as $i => $ex) {
            $name = trim((string)$ex['name']);
            if (mbStrlenCompat($name) > 255) continue;
            $sets = isset($ex['sets']) && $ex['sets'] !== '' && $ex['sets'] !== null && is_numeric($ex['sets']) ? min(255, max(0, (int)$ex['sets'])) : null;
            $reps = !empty($ex['reps']) ? mb_substr((string)$ex['reps'], 0, 50) : null;
            $rest = !empty($ex['restTime']) ? mb_substr((string)$ex['restTime'], 0, 50) : null;
            $notes = $rest !== null ? ('Rest: ' . $rest) : null;
            $exerciseId = isset($ex['exerciseId']) && is_numeric($ex['exerciseId']) ? (int)$ex['exerciseId'] : null;
            $exStmt->execute([
                $sessionId,
                $name,
                $sets,
                $reps,
                $notes,
                $i + 1,
                $exerciseId,
            ]);
        }

        $db->prepare("INSERT INTO session_participants (session_id, user_id, status) VALUES (?, ?, 'registered')")
            ->execute([$sessionId, $userId]);

        $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, icon_color, link, created_at)
            VALUES (?, 'routine', 'New routine assigned', ?, 'Dumbbell', '#10b981', '/client/dashboard', NOW())")
            ->execute([
                $userId,
                'Your coach assigned you "' . $input['title'] . '" for ' . $input['date'] . '. Check your next workout!',
            ]);

        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        error_log('assignClientRoutine failed: ' . $e->getMessage());
        error('Could not assign the routine', 500);
    }

    success(['id' => $sessionId], 'Routine assigned', 201);
}

function connectStripe(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $stmt->execute([$auth['sub']]);
    $trainer = $stmt->fetch();
    if (!$trainer) error('Trainer profile not found', 404);
    $trainerId = (int)$trainer['id'];
    if (!defined('STRIPE_SECRET_KEY') || !STRIPE_SECRET_KEY) {
        error('Stripe is not configured', 500);
    }
    require_once __DIR__ . '/../../helpers/stripe_connect.php';
    $result = createStripeConnectAccount($trainerId, $auth['sub']);
    if (!$result) error('Error creating Stripe account', 500);
    success($result, 'Onboarding link generated');
}

function getPayouts(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT id, amount, currency, stripe_transfer_id, status, description, paid_at, created_at FROM coach_payouts WHERE coach_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$auth['sub']]);
    success($stmt->fetchAll());
}

function getEarnings(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $userId = (int)$auth['sub'];
    $total = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM coach_earnings WHERE coach_id = ?");
    $total->execute([$userId]);
    $monthStmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM coach_earnings WHERE coach_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())");
    $monthStmt->execute([$userId]);
    $byMonth = $db->prepare("SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total FROM coach_earnings WHERE coach_id = ? GROUP BY month ORDER BY month DESC LIMIT 12");
    $byMonth->execute([$userId]);
    success([
        'totalEarnings' => (float)$total->fetchColumn(),
        'thisMonth' => (float)$monthStmt->fetchColumn(),
        'byMonth' => $byMonth->fetchAll(),
    ]);
}

function getClientDailySummary(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }

    $userStmt = $db->prepare("SELECT first_name, last_name, email, photo FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $userRow = $userStmt->fetch();
    if (!$userRow) {
        error('Client not found', 404);
    }
    $userName = trim($userRow['first_name'] . ' ' . $userRow['last_name']);

    // Today's check-in
    $checkinStmt = $db->prepare("SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = CURDATE()");
    $checkinStmt->execute([$userId]);
    $checkinRow = $checkinStmt->fetch();
    $checkin = $checkinRow ? [
        'mood' => $checkinRow['mood'],
        'sleepHours' => $checkinRow['sleep_hours'] ? (float)$checkinRow['sleep_hours'] : null,
        'energyLevel' => $checkinRow['energy_level'] ? (int)$checkinRow['energy_level'] : null,
        'notes' => $checkinRow['notes'],
        'date' => $checkinRow['checkin_date'],
    ] : null;

    // Goals with progress
    try {
        $goalStmt = $db->prepare("SELECT * FROM client_goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
        $goalStmt->execute([$userId]);
        $goals = array_map(function($g) {
            return [
                'id' => (int)$g['id'],
                'title' => $g['title'],
                'description' => $g['description'],
                'targetValue' => $g['target_value'] ? (float)$g['target_value'] : null,
                'unit' => $g['unit'],
                'currentValue' => $g['current_value'] ? (float)$g['current_value'] : null,
                'progress' => $g['target_value'] ? min(100, round(($g['current_value'] ?? 0) / $g['target_value'] * 100)) : 0,
                'startDate' => $g['start_date'],
                'targetDate' => $g['target_date'],
                'completed' => $g['status'] === 'completed',
            ];
        }, $goalStmt->fetchAll());
    } catch (\Exception $e) { $goals = []; }

    // Latest body metrics
    $metricStmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 1");
    $metricStmt->execute([$userId]);
    $metricsRow = $metricStmt->fetch();
    $bodyMetrics = $metricsRow ? [
        'weight' => ['value' => (float)$metricsRow['weight_kg'], 'unit' => 'kg'],
        'bodyFat' => ['value' => (float)$metricsRow['body_fat_pct'], 'unit' => '%'],
        'muscle' => ['value' => (float)$metricsRow['muscle_kg'], 'unit' => 'kg'],
        'bmi' => ['value' => (float)$metricsRow['bmi'], 'unit' => ''],
    ] : null;

    // Today's nutrition
    $nutritionStmt = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? AND log_date = CURDATE()");
    $nutritionStmt->execute([$userId]);
    $nutritionRow = $nutritionStmt->fetch();
    $nutrition = $nutritionRow ? [
        'calories' => ['consumed' => (int)$nutritionRow['calories_consumed'], 'target' => (int)$nutritionRow['calories_target']],
        'protein' => ['current' => (float)$nutritionRow['protein_current'], 'target' => (float)$nutritionRow['protein_target']],
        'carbs' => ['current' => (float)$nutritionRow['carbs_current'], 'target' => (float)$nutritionRow['carbs_target']],
        'fat' => ['current' => (float)$nutritionRow['fat_current'], 'target' => (float)$nutritionRow['fat_target']],
        'waterGlasses' => (int)$nutritionRow['water_glasses'],
        'mealChecked' => [
            (bool)$nutritionRow['breakfast_checked'],
            (bool)$nutritionRow['lunch_checked'],
            (bool)$nutritionRow['dinner_checked'],
            (bool)$nutritionRow['snack_checked'],
        ],
        'date' => $nutritionRow['log_date'],
    ] : null;

    // Progress photos (latest 4)
    try {
        $photoStmt = $db->prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC LIMIT 4");
        $photoStmt->execute([$userId]);
        $photos = array_map(function($p) {
            return [
                'id' => (int)$p['id'],
                'photoUrl' => $p['photo_url'],
                'photoType' => $p['photo_type'],
                'takenAt' => $p['taken_at'],
            ];
        }, $photoStmt->fetchAll());
    } catch (\Exception $e) { $photos = []; }

    // Active program
    $progStmt = $db->prepare("
        SELECT p.*, up.progress, up.current_week,
               CONCAT(t.first_name, ' ', t.last_name) as coach_name
        FROM user_programs up
        JOIN programs p ON p.id = up.program_id
        LEFT JOIN trainers t ON t.id = p.trainer_id
        WHERE up.user_id = ? AND up.status = 'active'
        ORDER BY up.started_at DESC LIMIT 1
    ");
    $progStmt->execute([$userId]);
    $progRow = $progStmt->fetch();
    $activeProgram = $progRow ? [
        'name' => $progRow['name'],
        'coach' => $progRow['coach_name'] ?? null,
        'duration' => ($progRow['duration_minutes'] ?? '40 min') . ' sessions',
        'week' => 'Week ' . ($progRow['current_week'] ?? 1) . '/' . ($progRow['weeks'] ?? 12),
        'progress' => (int)($progRow['progress'] ?? 0),
        'currentWeek' => (int)($progRow['current_week'] ?? 1),
        'totalWeeks' => (int)($progRow['weeks'] ?? 12),
    ] : null;

    // Achievements
    try {
        $achStmt = $db->prepare("
            SELECT a.*, ua.achievement_id IS NOT NULL as unlocked
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
            ORDER BY a.sort_order
        ");
        $achStmt->execute([$userId]);
        $achievements = array_map(function($a) {
            return [
                'label' => $a['label'],
                'icon' => $a['icon'] ?? 'Award',
                'unlocked' => (bool)$a['unlocked'],
            ];
        }, $achStmt->fetchAll());
    } catch (\Exception $e) { $achievements = []; }

    // Recent activity
    try {
        $activityStmt = $db->prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
        $activityStmt->execute([$userId]);
        $recentActivity = array_map(function($a) {
            return [
                'type' => $a['type'],
                'description' => $a['description'],
                'time' => $a['created_at'],
            ];
        }, $activityStmt->fetchAll());
    } catch (\Exception $e) { $recentActivity = []; }

    // KPIs (workouts this month, total hours, streak)
    $thisMonth = date('Y-m-01');
    try {
        $workoutsStmt = $db->prepare("
            SELECT COUNT(*) FROM session_participants sp
            JOIN sessions s ON s.id = sp.session_id
            WHERE sp.user_id = ? AND sp.status = 'completed' AND s.date >= ?
        ");
        $workoutsStmt->execute([$userId, $thisMonth]);
        $workoutsDone = (int)$workoutsStmt->fetchColumn();
    } catch (\Exception $e) { $workoutsDone = 0; }

    try {
        $hoursStmt = $db->prepare("
            SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time)) / 3600), 0)
            FROM session_participants sp
            JOIN sessions s ON s.id = sp.session_id
            WHERE sp.user_id = ? AND sp.status = 'completed' AND s.date >= ? AND s.start_time IS NOT NULL AND s.end_time IS NOT NULL
        ");
        $hoursStmt->execute([$userId, $thisMonth]);
        $totalHours = round((float)$hoursStmt->fetchColumn(), 1);
    } catch (\Exception $e) { $totalHours = 0; }

    // Streak from daily check-ins
    $streakStmt = $db->prepare("SELECT checkin_date FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 60");
    $streakStmt->execute([$userId]);
    $checkinDates = $streakStmt->fetchAll(PDO::FETCH_COLUMN);
    $today = new DateTime();
    $streak = 0;
    $expected = clone $today;
    if (!empty($checkinDates) && $checkinDates[0] === $today->format('Y-m-d')) {
        $streak = 1;
    } elseif (!empty($checkinDates) && $checkinDates[0] === (clone $today)->modify('-1 day')->format('Y-m-d')) {
        $expected->modify('-1 day');
        $streak = 1;
    } else {
        $expected = null;
    }
    if ($expected && count($checkinDates) > 1) {
        for ($i = 0; $i < count($checkinDates) - 1; $i++) {
            $current = new DateTime($checkinDates[$i]);
            $next = new DateTime($checkinDates[$i + 1]);
            $diff = $current->diff($next)->days;
            if ($diff === 1) {
                $streak++;
            } else {
                break;
            }
        }
    }

    // Notifications
    $notifStmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
    $notifStmt->execute([$userId]);
    $notifications = array_map(function($n) {
        return [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'title' => $n['title'],
            'message' => $n['message'],
            'icon' => $n['icon'],
            'link' => $n['link'],
            'read' => (bool)$n['is_read'],
            'createdAt' => $n['created_at'],
        ];
    }, $notifStmt->fetchAll());

    // Next scheduled workout
    $nextStmt = $db->prepare("
        SELECT s.id, s.title, s.date, s.start_time
        FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id AND s.status = 'scheduled' AND s.date >= CURDATE()
        WHERE sp.user_id = ? AND sp.status = 'registered'
        ORDER BY s.date ASC, s.start_time ASC LIMIT 1
    ");
    $nextStmt->execute([$userId]);
    $nextRow = $nextStmt->fetch();
    $nextWorkout = $nextRow ? [
        'id' => (int)$nextRow['id'],
        'title' => $nextRow['title'],
        'date' => $nextRow['date'],
        'time' => $nextRow['start_time'] ? date('H:i', strtotime($nextRow['start_time'])) : null,
    ] : null;

    success([
        'userName' => $userName,
        'email' => $userRow['email'],
        'photo' => $userRow['photo'],
        'kpis' => [
            'workouts' => $workoutsDone,
            'totalHours' => $totalHours,
            'streak' => $streak,
        ],
        'checkin' => $checkin,
        'goals' => $goals,
        'bodyMetrics' => $bodyMetrics,
        'nutrition' => $nutrition,
        'photos' => $photos,
        'activeProgram' => $activeProgram,
        'achievements' => $achievements,
        'recentActivity' => $recentActivity,
        'notifications' => $notifications,
        'nextWorkout' => $nextWorkout,
    ]);
}

/**
 * True when the coach has a real relationship with the client:
 * an active enrollment in a program owned by the coach's trainer,
 * or any session tied to the coach's trainer for that client.
 */
function coachHasClient(int $coachUserId, int $clientUserId): bool {
    $db = getDB();
    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$coachUserId]);
    $trainerId = (int)$trainerStmt->fetchColumn();
    if (!$trainerId) return false;

    $chk = $db->prepare("SELECT up.id FROM user_programs up JOIN programs p ON p.id = up.program_id WHERE up.user_id = ? AND p.trainer_id = ? AND up.status = 'active'");
    $chk->execute([$clientUserId, $trainerId]);
    if ($chk->fetch()) return true;

    $chk2 = $db->prepare("SELECT id FROM sessions WHERE user_id = ? AND trainer_id = ? LIMIT 1");
    $chk2->execute([$clientUserId, $trainerId]);
    if ($chk2->fetch()) return true;

    return false;
}

function verifyCoachClient(int $coachUserId, int $clientUserId): void {
    if (!coachHasClient($coachUserId, $clientUserId)) {
        error('You do not have permission to access this client', 403);
    }
}

function getClientNotes(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $coachId = $auth['sub'];
    $stmt = $db->prepare("
        SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) as coach_name
        FROM client_notes cn
        JOIN users u ON u.id = cn.coach_id
        WHERE cn.coach_id = ? AND cn.client_id = ?
        ORDER BY cn.created_at DESC
    ");
    $stmt->execute([$coachId, $userId]);
    $result = array_map(function($n) {
        return [
            'id' => (int)$n['id'],
            'title' => $n['title'],
            'content' => $n['content'],
            'category' => $n['category'],
            'coachName' => $n['coach_name'],
            'createdAt' => $n['created_at'],
            'updatedAt' => $n['updated_at'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function createClientNote(string $id): void {
    $auth = requireRole('coach', 'admin');
    $input = getJsonInput();
    $rules = ['title' => 'required|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $coachId = $auth['sub'];
    $title = $input['title'];
    $content = $input['content'] ?? null;
    $category = in_array($input['category'] ?? '', ['general','nutrition','training','progress','health']) ? $input['category'] : 'general';
    $db->prepare("INSERT INTO client_notes (coach_id, client_id, title, content, category) VALUES (?, ?, ?, ?, ?)")
        ->execute([$coachId, $userId, $title, $content, $category]);
    $noteId = (int)$db->lastInsertId();
    success(['id' => $noteId, 'title' => $title, 'content' => $content, 'category' => $category], 'Note created', 201);
}

function deleteClientNote(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $noteId = (int)$id;
    $coachId = $auth['sub'];
    $stmt = $db->prepare("SELECT id FROM client_notes WHERE id = ? AND coach_id = ?");
    $stmt->execute([$noteId, $coachId]);
    if (!$stmt->fetch()) error('Note not found', 404);
    $db->prepare("DELETE FROM client_notes WHERE id = ? AND coach_id = ?")->execute([$noteId, $coachId]);
    success(null, 'Note deleted');
}

/**
 * Stripe Connect onboarding status for the coach UI.
 * QA-audit fix: CoachConnectResult/CoachEarningsPanel called
 * GET /coach/connect-status which did not exist.
 */
function getConnectStatus(): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $stmt = $db->prepare("SELECT stripe_account_id, stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_onboarding_url FROM trainers WHERE user_id = ?");
    $stmt->execute([$auth['sub']]);
    $t = $stmt->fetch();
    if (!$t) error('Trainer profile not found', 404);
    $accountId = $t['stripe_connect_account_id'] ?? ($t['stripe_account_id'] ?? null);
    success([
        'connected' => (bool)$accountId && !empty($t['stripe_connect_onboarding_complete']),
        'onboardingComplete' => (bool)$t['stripe_connect_onboarding_complete'],
        'accountId' => $accountId,
        'onboardingUrl' => $t['stripe_connect_onboarding_url'],
        'stripeConfigured' => defined('STRIPE_SECRET_KEY') && !empty(STRIPE_SECRET_KEY) && !str_starts_with(STRIPE_SECRET_KEY, 'sk_test_placeholder'),
    ]);
}
