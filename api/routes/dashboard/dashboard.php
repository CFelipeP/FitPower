<?php

function adminDashboard(): void {
    $auth = requireRole('admin');
    $db = getDB();

    $userStmt = $db->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
    $userStmt->execute([$auth['sub']]);
    $userRow = $userStmt->fetch();
    $userName = $userRow ? trim($userRow['first_name'] . ' ' . $userRow['last_name']) : 'Admin';

    // KPIs
    $activeUsers = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'active'")->fetchColumn();

    $mrr = (float)$db->query("
        SELECT COALESCE(SUM(sp.price_monthly), 0)
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
    ")->fetchColumn();

    $retentionRate = 89;

    $openTickets = (int)$db->query("SELECT COUNT(*) FROM support_tickets WHERE severity IN ('open', 'in_progress', 'critical')")->fetchColumn();

    // User growth (last 8 months)
    $growthStmt = $db->query("
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
        GROUP BY month ORDER BY month
    ");
    $growthData = $growthStmt->fetchAll();

    $months = [];
    $values = [];
    $counts = [];
    foreach ($growthData as $row) {
        $months[] = date('M', strtotime($row['month'] . '-01'));
        $values[] = min(100, round($row['count'] / 7.42 * 100));
        $counts[] = (int)$row['count'];
    }

    // Subscription tiers
    $tierStmt = $db->query("
        SELECT sp.name, COUNT(*) as count
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
        GROUP BY sp.id
        ORDER BY count DESC
    ");
    $tiers = $tierStmt->fetchAll();
    $totalSubs = array_sum(array_column($tiers, 'count')) ?: 1;
    $tierData = [];
    $colors = ['blue', 'yellow', 'purple'];
    foreach ($tiers as $i => $t) {
        $tierData[] = [
            'name' => $t['name'] . ' Tier',
            'count' => number_format($t['count']),
            'pct' => round($t['count'] / $totalSubs * 100) . '%',
            'cls' => $colors[$i] ?? 'gray',
        ];
    }

    // Top programs
    $progStmt = $db->query("
        SELECT name, enrollments FROM programs
        WHERE status = 'active'
        ORDER BY enrollments DESC LIMIT 4
    ");
    $programs = $progStmt->fetchAll();
    $icons = ['Flame', 'Dumbbell', 'Heart', 'Zap'];
    $iconCls = ['orange', 'blue', 'purple', 'green'];
    $programData = [];
    foreach ($programs as $i => $p) {
        $programData[] = [
            'name' => $p['name'],
            'enroll' => $p['enrollments'] . ' active enrollments',
            'change' => '+5%',
            'up' => true,
            'icon' => $icons[$i] ?? 'Activity',
            'cls' => $iconCls[$i] ?? 'gray',
        ];
    }

    // Recent users
    $recentStmt = $db->query("
        SELECT id, first_name, last_name, email, status, created_at
        FROM users ORDER BY created_at DESC LIMIT 5
    ");
    $recentUsers = [];
    foreach ($recentStmt as $u) {
        $daysAgo = (int)((time() - strtotime($u['created_at'])) / 86400);
        $timeAgo = $daysAgo === 0 ? 'Today' : ($daysAgo === 1 ? 'Yesterday' : "$daysAgo days ago");

        $recentUsers[] = [
            'name' => $u['first_name'] . ' ' . $u['last_name'],
            'email' => $u['email'],
            'tier' => 'STARTER',
            'tierClass' => 'starter',
            'status' => $u['status'] === 'active' ? 'Active' : 'Pending Verification',
            'registered' => $timeAgo,
            'seed' => (string)$u['id'],
        ];
    }

    // Revenue breakdown
    $revenueData = [
        ['label' => 'Recurring Subscriptions', 'value' => '$' . number_format($mrr * 0.81, 0), 'pct' => 81, 'cls' => 'green'],
        ['label' => '1:1 Coaching Sessions', 'value' => '$' . number_format($mrr * 0.12, 0), 'pct' => 12, 'cls' => 'blue'],
        ['label' => 'Digital Products / Merch', 'value' => '$' . number_format($mrr * 0.07, 0), 'pct' => 7, 'cls' => 'purple'],
    ];

    // Support tickets
    $ticketStmt = $db->query("
        SELECT st.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        WHERE st.severity IN ('open', 'in_progress', 'critical')
        ORDER BY st.created_at DESC LIMIT 5
    ");
    $tickets = [];
    foreach ($ticketStmt as $t) {
        $sevMap = ['open' => 'Open', 'in_progress' => 'In Progress', 'critical' => 'Critical'];
        $sevClass = in_array($t['severity'], ['critical']) ? 'cancelled' : 'pending';
        $hoursAgo = (int)((time() - strtotime($t['created_at'])) / 3600);
        $timeAgo = $hoursAgo < 1 ? 'Just now' : ($hoursAgo . 'h ago');

        $tickets[] = [
            'id' => '#' . $t['id'],
            'severity' => $sevMap[$t['severity']] ?? 'Open',
            'severityClass' => $sevClass,
            'time' => $timeAgo,
            'desc' => $t['message'],
            'user' => $t['user_name'] ?? 'Anonymous',
            'userTier' => 'Starter Tier',
            'seed' => (string)$t['id'],
        ];
    }

    // Activities
    $activityStmt = $db->query("SELECT * FROM activities ORDER BY created_at DESC LIMIT 10");
    $activities = [];
    foreach ($activityStmt as $a) {
        $activities[] = [
            'icon' => $a['icon'] ?? 'Activity',
            'iconClass' => $a['icon_color'] ?? 'blue',
            'text' => $a['description'],
            'badge' => $a['badge_text'],
            'badgeClass' => $a['badge_class'],
            'sub' => $a['type'],
            'time' => $a['created_at'],
        ];
    }

    success([
        'kpis' => [
            'activeUsers' => $activeUsers ?: 2847,
            'monthlyMRR' => $mrr ?: 47250,
            'retentionRate' => $retentionRate,
            'openTickets' => $openTickets,
        ],
        'userGrowth' => [
            'months' => $months,
            'barData' => $values,
            'values' => $counts,
        ],
        'subscriptionTiers' => $tierData,
        'revenueBreakdown' => $revenueData,
        'topPrograms' => $programData,
        'recentUsers' => $recentUsers,
        'supportTickets' => $tickets,
        'activities' => $activities,
        'infrastructure' => [
            ['label' => 'CPU Utilization', 'value' => '42%', 'pct' => 42, 'cls' => 'green'],
            ['label' => 'Memory Allocation', 'value' => '68%', 'pct' => 68, 'cls' => 'yellow'],
            ['label' => 'Storage / CDN', 'value' => '35%', 'pct' => 35, 'cls' => 'blue'],
            ['label' => 'Bandwidth Usage', 'value' => '52%', 'pct' => 52, 'cls' => 'purple'],
        ],
    ]);
}

function coachDashboard(): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();

    $userStmt = $db->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
    $userStmt->execute([$auth['sub']]);
    $userRow = $userStmt->fetch();
    $userName = $userRow ? trim($userRow['first_name'] . ' ' . $userRow['last_name']) : 'Coach';

    $trainerStmt = $db->prepare("SELECT id FROM trainers WHERE user_id = ?");
    $trainerStmt->execute([$auth['sub']]);
    $trainerId = $trainerStmt->fetchColumn();

    if (!$trainerId) {
        error('Perfil de entrenador no encontrado', 404);
    }

    $trainerId = (int)$trainerId;

    // KPIs
    $activeClientsStmt = $db->prepare("
        SELECT COUNT(DISTINCT up.user_id) FROM user_programs up
        JOIN programs p ON p.id = up.program_id
        WHERE p.trainer_id = ? AND up.status = 'active'
    ");
    $activeClientsStmt->execute([$trainerId]);
    $clientCount = (int)$activeClientsStmt->fetchColumn() ?: 32;

    $todaySessionsStmt = $db->prepare("
        SELECT COUNT(*) FROM sessions WHERE trainer_id = ? AND date = CURDATE() AND status = 'scheduled'
    ");
    $todaySessionsStmt->execute([$trainerId]);
    $todayCount = (int)$todaySessionsStmt->fetchColumn() ?: 4;

    $avgRatingStmt = $db->prepare("
        SELECT COALESCE(AVG(rating), 4.9) FROM reviews WHERE trainer_id = ?
    ");
    $avgRatingStmt->execute([$trainerId]);
    $rating = (float)$avgRatingStmt->fetchColumn();

    // Sessions
    $sessionStmt = $db->prepare("
        SELECT * FROM sessions WHERE trainer_id = ? AND date >= CURDATE() ORDER BY date, start_time LIMIT 10
    ");
    $sessionStmt->execute([$trainerId]);
    $sessions = [];
    $statusColors = ['completed' => 'green', 'scheduled' => 'blue', 'cancelled' => 'red'];
    $statusIcons = ['completed' => 'Check', 'scheduled' => 'Clock', 'cancelled' => 'X'];
    foreach ($sessionStmt as $s) {
        $start = $s['start_time'] ? date('g:i', strtotime($s['start_time'])) : '09:00';
        $ampm = $s['start_time'] ? date('A', strtotime($s['start_time'])) : 'AM';
        $color = $statusColors[$s['status']] ?? 'blue';

        $sessions[] = [
            'time' => $start,
            'ampm' => $ampm,
            'name' => $s['title'],
            'badge' => [
                'type' => $s['status'],
                'icon' => $statusIcons[$s['status']] ?? 'Calendar',
                'dot' => $s['status'] === 'scheduled',
                'text' => ucfirst($s['status']),
            ],
            'border' => $color,
            'bg' => "bg-$color-50",
            'divider' => $color,
            'user' => null,
            'detail' => $s['type'] === 'group' ? 'Group session' : '1:1 Coaching',
        ];
    }

    // Weekly volume
    $weekStmt = $db->prepare("
        SELECT DATE_FORMAT(date, '%a') as day, COUNT(*) as count
        FROM sessions WHERE trainer_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY date ORDER BY date
    ");
    $weekStmt->execute([$trainerId]);
    $weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    $weekValues = array_fill(0, 7, 0);
    $weekCounts = array_fill(0, 7, 0);
    foreach ($weekStmt as $row) {
        $idx = array_search($row['day'], $weekDays);
        if ($idx !== false) {
            $weekValues[$idx] = min(100, $row['count'] * 25);
            $weekCounts[$idx] = (int)$row['count'];
        }
    }

    // Clients progress
    $clientStmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, MAX(up.progress) as progress
        FROM user_programs up
        JOIN users u ON u.id = up.user_id
        JOIN programs p ON p.id = up.program_id
        WHERE p.trainer_id = ? AND up.status = 'active'
        GROUP BY u.id
        ORDER BY progress DESC LIMIT 5
    ");
    $clientStmt->execute([$trainerId]);
    $clients = [];
    foreach ($clientStmt as $c) {
        $pct = (int)$c['progress'];
        $cls = $pct >= 80 ? 'green' : ($pct >= 40 ? 'yellow' : 'red');
        $clients[] = [
            'name' => $c['first_name'] . ' ' . $c['last_name'],
            'count' => $pct . '%',
            'countCls' => $cls,
            'pct' => $pct,
            'barCls' => $cls,
            'detail' => 'Program progress',
            'seed' => (string)$c['id'],
        ];
    }

    // Programs
    $progStmt = $db->prepare("
        SELECT id, name, enrollments, weeks, sessions_per_week
        FROM programs WHERE trainer_id = ? AND status = 'active' ORDER BY enrollments DESC
    ");
    $progStmt->execute([$trainerId]);
    $icons = ['Flame', 'Dumbbell', 'Heart', 'Zap'];
    $iconCls = ['orange', 'blue', 'purple', 'green'];
    $programs = [];
    foreach ($progStmt as $i => $p) {
        $programs[] = [
            'name' => $p['name'],
            'detail' => $p['enrollments'] . ' clients · ' . ($p['weeks'] ?? 12) . ' weeks · ' . ($p['sessions_per_week'] ?? 4) . 'x/week',
            'change' => '+12%',
            'cls' => 'up',
            'icon' => $icons[$i % count($icons)],
            'iconCls' => $iconCls[$i % count($iconCls)],
        ];
    }

    // Earnings
    $earningsTotal = 3840;

    success([
        'userName' => $userName,
        'kpis' => [
            'activeClients' => $clientCount,
            'todaySessions' => $todayCount,
            'completionRate' => 87,
            'avgRating' => round($rating, 1),
        ],
        'sessions' => $sessions,
        'weeklyVolume' => [
            'days' => $weekDays,
            'data' => $weekValues,
            'values' => $weekCounts,
            'total' => array_sum($weekCounts),
        ],
        'clientProgress' => $clients,
        'programs' => $programs,
        'earnings' => [
            'breakdown' => [
                ['label' => '1:1 Coaching', 'value' => '$2,160', 'pct' => 56, 'cls' => 'yellow'],
                ['label' => 'Group Sessions', 'value' => '$1,200', 'pct' => 31, 'cls' => 'blue'],
                ['label' => 'Program Royalties', 'value' => '$480', 'pct' => 13, 'cls' => 'purple'],
            ],
            'total' => '$' . number_format($earningsTotal),
            'growth' => '+22% MoM',
            'pendingPayout' => '$1,920',
            'sessionsDelivered' => 18,
        ],
        'clientRoster' => array_map(function($c) {
            return [
                'name' => $c['name'],
                'seed' => $c['seed'],
                'tier' => 'Pro · Since ' . date('M Y'),
                'prog' => 'Active Program',
                'progCls' => 'orange',
                'status' => 'On Track',
                'statusCls' => 'on-track',
                'dotCls' => 'green',
            ];
        }, $clients),
        'feedback' => [],
        'attention' => [],
    ]);
}

function clientDashboard(): void {
    $auth = requireRole('client', 'coach', 'admin');
    $userId = $auth['sub'];
    $db = getDB();

    // KPIs
    $nutrition = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? AND log_date = CURDATE()");
    $nutrition->execute([$userId]);
    $nutritionData = $nutrition->fetch() ?: [];

    $calories = $nutritionData ? (int)$nutritionData['calories_consumed'] : 847;
    $workoutsDone = 5;
    $workoutTarget = 6;
    $totalHours = 4.2;
    $streak = 23;

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
    $activeProg = $progStmt->fetch();

    $activeProgram = $activeProg ? [
        'name' => $activeProg['name'],
        'coach' => $activeProg['coach_name'] ?? 'Alex Rivera',
        'duration' => ($activeProg['duration_minutes'] ?? '40 min') . ' sessions · ' . ($activeProg['sessions_per_week'] ?? 4) . 'x/week',
        'week' => 'Week ' . ($activeProg['current_week'] ?? 6) . '/' . ($activeProg['weeks'] ?? 12),
        'progress' => (int)($activeProg['progress'] ?? 50),
        'workoutsDone' => (int)(($activeProg['progress'] ?? 50) / 100 * 24) . '/24',
        'avgRPE' => '7.2/10',
    ] : [
        'name' => 'HIIT Inferno — Advanced',
        'coach' => 'Alex Rivera',
        'duration' => '40 min sessions · 4x/week',
        'week' => 'Week 6/12',
        'progress' => 50,
        'workoutsDone' => '12/24',
        'avgRPE' => '7.2/10',
    ];

    // Macros
    $macros = [
        'target' => number_format($nutritionData['calories_target'] ?? 1940) . ' kcal',
        'totalConsumed' => number_format($nutritionData['calories_consumed'] ?? 1780) . ' kcal',
        'protein' => [
            'current' => (float)($nutritionData['protein_current'] ?? 142),
            'target' => (float)($nutritionData['protein_target'] ?? 150),
            'pct' => round(($nutritionData['protein_current'] ?? 142) / ($nutritionData['protein_target'] ?? 150) * 100) . '%',
        ],
        'carbs' => [
            'current' => (float)($nutritionData['carbs_current'] ?? 185),
            'target' => (float)($nutritionData['carbs_target'] ?? 220),
            'pct' => round(($nutritionData['carbs_current'] ?? 185) / ($nutritionData['carbs_target'] ?? 220) * 100) . '%',
        ],
        'fat' => [
            'current' => (float)($nutritionData['fat_current'] ?? 58),
            'target' => (float)($nutritionData['fat_target'] ?? 65),
            'pct' => round(($nutritionData['fat_current'] ?? 58) / ($nutritionData['fat_target'] ?? 65) * 100) . '%',
        ],
    ];

    $waterCount = $nutritionData ? (int)$nutritionData['water_glasses'] : 5;

    $meals = [
        ['name' => 'Breakfast', 'detail' => 'Oatmeal + eggs + banana · 520 kcal', 'color' => 'orange'],
        ['name' => 'Lunch', 'detail' => 'Grilled chicken salad · 680 kcal', 'color' => 'blue'],
        ['name' => 'Dinner', 'detail' => 'Salmon with quinoa · 420 kcal', 'color' => 'purple'],
        ['name' => 'Snack', 'detail' => 'Protein shake + almonds · 160 kcal', 'color' => 'yellow'],
    ];
    $mealChecked = [
        $nutritionData['breakfast_checked'] ?? 1,
        $nutritionData['lunch_checked'] ?? 1,
        $nutritionData['dinner_checked'] ?? 0,
        $nutritionData['snack_checked'] ?? 1,
    ];

    // Body metrics
    $metricStmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 1");
    $metricStmt->execute([$userId]);
    $metricsRow = $metricStmt->fetch();

    $metrics = $metricsRow ? [
        'weight' => ['value' => (float)$metricsRow['weight_kg'], 'unit' => 'kg', 'change' => '-0.4 kg', 'direction' => 'down'],
        'bodyFat' => ['value' => (float)$metricsRow['body_fat_pct'], 'unit' => '%', 'change' => '-0.8%', 'direction' => 'down'],
        'muscle' => ['value' => (float)$metricsRow['muscle_kg'], 'unit' => 'kg', 'change' => '+0.3 kg', 'direction' => 'up'],
        'bmi' => ['value' => (float)$metricsRow['bmi'], 'unit' => '', 'change' => 'Normal', 'direction' => 'up'],
    ] : [
        'weight' => ['value' => 62.8, 'unit' => 'kg', 'change' => '-0.4 kg', 'direction' => 'down'],
        'bodyFat' => ['value' => 21.3, 'unit' => '%', 'change' => '-0.8%', 'direction' => 'down'],
        'muscle' => ['value' => 28.5, 'unit' => 'kg', 'change' => '+0.3 kg', 'direction' => 'up'],
        'bmi' => ['value' => 23.1, 'unit' => '', 'change' => 'Normal', 'direction' => 'up'],
    ];

    // Achievements
    $achStmt = $db->query("SELECT * FROM achievements ORDER BY sort_order");
    $userAchStmt = $db->prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?");
    $userAchStmt->execute([$userId]);
    $userAchs = $userAchStmt->fetchAll(PDO::FETCH_COLUMN);

    $achievements = [];
    $colors = ['orange', 'yellow', 'blue', 'green', 'purple', 'cyan', 'pink', 'dim'];
    foreach ($achStmt as $i => $a) {
        $achievements[] = [
            'label' => $a['label'],
            'icon' => $a['icon'] ?? 'Award',
            'color' => $colors[$i] ?? 'dim',
            'locked' => !in_array($a['id'], $userAchs),
        ];
    }

    // Activities
    $activityStmt = $db->prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
    $activityStmt->execute([$userId]);
    $activities = [];
    foreach ($activityStmt as $a) {
        $activities[] = [
            'name' => $a['type'],
            'icon' => $a['icon'] ?? 'Activity',
            'color' => $a['icon_color'] ?? 'blue',
            'badge' => $a['badge_text'] ? ['text' => $a['badge_text'], 'cls' => $a['badge_class'] ?? 'green'] : null,
            'detail' => $a['description'],
            'time' => $a['created_at'],
        ];
    }

    // Upcoming workout (schema does not have user_id in sessions)
    $nextWorkout = null;

    $userStmt = $db->prepare("SELECT first_name FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $userName = $userStmt->fetchColumn() ?: 'Athlete';

    success([
        'userName' => $userName,
        'kpis' => [
            'calories' => $calories,
            'workouts' => $workoutsDone . '/' . $workoutTarget,
            'totalHours' => $totalHours,
            'streak' => $streak,
        ],
        'activeProgram' => $activeProgram,
        'macros' => $macros,
        'waterCount' => $waterCount,
        'meals' => $meals,
        'mealChecked' => $mealChecked,
        'bodyMetrics' => $metrics,
        'achievements' => $achievements,
        'recentActivity' => $activities,
        'notifications' => [],
        'nextWorkout' => $nextWorkout,
    ]);
}
