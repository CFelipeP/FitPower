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
        success(['date' => $date, 'message' => 'Sin datos para esta fecha']);
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
    $rules = ['sessionId' => 'required|numeric'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $userId = (int)$id;
    if ($auth['role'] !== 'admin') {
        verifyCoachClient($auth['sub'], $userId);
    }
    $stmt = $db->prepare("SELECT id, title FROM sessions WHERE id = ?");
    $stmt->execute([(int)$input['sessionId']]);
    $session = $stmt->fetch();
    if (!$session) error('Sesión no encontrada', 404);
    $chk = $db->prepare("SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?");
    $chk->execute([$session['id'], $userId]);
    if ($chk->fetch()) error('El cliente ya tiene asignada esta rutina', 409);
    $db->prepare("INSERT INTO session_participants (session_id, user_id, status) VALUES (?, ?, 'registered')")
        ->execute([$session['id'], $userId]);
    $db->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'routine', 'Nueva rutina asignada', ?)")
        ->execute([$userId, 'Se te ha asignado la rutina: ' . $session['title']]);
    success(null, 'Rutina asignada', 201);
}

function connectStripe(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $stmt->execute([$auth['sub']]);
    $trainer = $stmt->fetch();
    if (!$trainer) error('Perfil de entrenador no encontrado', 404);
    $trainerId = (int)$trainer['id'];
    if (!defined('STRIPE_SECRET_KEY') || !STRIPE_SECRET_KEY) {
        error('Stripe no está configurado', 500);
    }
    require_once __DIR__ . '/../../helpers/stripe_connect.php';
    $result = createStripeConnectAccount($trainerId, $auth['sub']);
    if (!$result) error('Error al crear cuenta de Stripe', 500);
    success($result, 'Enlace de onboarding generado');
}

function getPayouts(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $stmt->execute([$auth['sub']]);
    $trainer = $stmt->fetch();
    if (!$trainer) error('Perfil de entrenador no encontrado', 404);
    $trainerId = (int)$trainer['id'];
    $stmt = $db->prepare("SELECT * FROM coach_payouts WHERE trainer_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$trainerId]);
    success($stmt->fetchAll());
}

function getEarnings(): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $stmt->execute([$auth['sub']]);
    $trainer = $stmt->fetch();
    if (!$trainer) error('Perfil de entrenador no encontrado', 404);
    $trainerId = (int)$trainer['id'];
    $total = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM coach_earnings WHERE trainer_id = ?");
    $total->execute([$trainerId]);
    $monthStmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM coach_earnings WHERE trainer_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())");
    $monthStmt->execute([$trainerId]);
    $byMonth = $db->prepare("SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total FROM coach_earnings WHERE trainer_id = ? GROUP BY month ORDER BY month DESC LIMIT 12");
    $byMonth->execute([$trainerId]);
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
        $goalStmt = $db->prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
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
                'completed' => (bool)$g['completed'],
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

function verifyCoachClient(int $coachUserId, int $clientUserId): void {
    $db = getDB();
    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$coachUserId]);
    $trainerId = $trainerStmt->fetchColumn();
    if (!$trainerId) error('Perfil de entrenador no encontrado', 404);
    $trainerId = (int)$trainerId;
    $chk = $db->prepare("SELECT up.id FROM user_programs up JOIN programs p ON p.id = up.program_id WHERE up.user_id = ? AND p.trainer_id = ? AND up.status = 'active'");
    $chk->execute([$clientUserId, $trainerId]);
    if (!$chk->fetch()) {
        $chk2 = $db->prepare("SELECT id FROM users WHERE id = ? AND role = 'client'");
        $chk2->execute([$clientUserId]);
        if (!$chk2->fetch()) error('Cliente no encontrado', 404);
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
    if ($errors) error('Error de validación', 422, $errors);
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
    success(['id' => $noteId, 'title' => $title, 'content' => $content, 'category' => $category], 'Nota creada', 201);
}

function deleteClientNote(string $id): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $noteId = (int)$id;
    $coachId = $auth['sub'];
    $stmt = $db->prepare("SELECT id FROM client_notes WHERE id = ? AND coach_id = ?");
    $stmt->execute([$noteId, $coachId]);
    if (!$stmt->fetch()) error('Nota no encontrada', 404);
    $db->prepare("DELETE FROM client_notes WHERE id = ? AND coach_id = ?")->execute([$noteId, $coachId]);
    success(null, 'Nota eliminada');
}
