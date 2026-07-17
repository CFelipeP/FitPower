<?php

function adminDashboard(): void {
    $auth = requireRole('admin');
    $db = getDB();

    $userStmt = $db->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
    $userStmt->execute([$auth['sub']]);
    $userRow = $userStmt->fetch();
    $userName = $userRow ? trim($userRow['first_name'] . ' ' . $userRow['last_name']) : 'Admin';

    // Combined KPIs (7 queries → 1 round trip)
    $kpiRow = $db->query("
        SELECT
            (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'cancelled') as cancelled_subs,
            (SELECT COUNT(*) FROM user_subscriptions) as total_subs_ever,
            (SELECT COUNT(*) FROM support_tickets WHERE severity IN ('open', 'in_progress', 'critical')) as open_tickets
    ")->fetch();

    $activeUsers = (int)$kpiRow['active_users'];
    $totalUsers = (int)$kpiRow['total_users'];
    $totalSubsEver = (int)$kpiRow['total_subs_ever'];
    $cancelledSubs = (int)$kpiRow['cancelled_subs'];
    $openTickets = (int)$kpiRow['open_tickets'];
    $retentionRate = $totalSubsEver > 0 ? round(($totalSubsEver - $cancelledSubs) / $totalSubsEver * 100) : 89;

    $mrr = (float)$db->query("
        SELECT COALESCE(SUM(
            CASE WHEN us.billing = 'yearly' THEN sp.price_yearly / 12 ELSE sp.price_monthly END
        ), 0)
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
    ")->fetchColumn();

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
    $maxCount = 1;
    foreach ($growthData as $row) {
        $months[] = date('M', strtotime($row['month'] . '-01'));
        $counts[] = (int)$row['count'];
        $maxCount = max($maxCount, (int)$row['count']);
    }
    foreach ($counts as $c) {
        $values[] = $maxCount > 0 ? round($c / $maxCount * 100) : 0;
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

    // Recent users with subscription info
    $recentStmt = $db->query("
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.created_at,
               COALESCE(sp.name, 'No Plan') as plan_name
        FROM users u
        LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        ORDER BY u.created_at DESC LIMIT 5
    ");
    $recentUsers = [];
    foreach ($recentStmt as $u) {
        $daysAgo = (int)((time() - strtotime($u['created_at'])) / 86400);
        $timeAgo = $daysAgo === 0 ? 'Today' : ($daysAgo === 1 ? 'Yesterday' : "$daysAgo days ago");

        $recentUsers[] = [
            'id' => (int)$u['id'],
            'name' => $u['first_name'] . ' ' . $u['last_name'],
            'email' => $u['email'],
            'role' => $u['role'],
            'tier' => $u['plan_name'] === 'No Plan' ? 'No Plan' : strtoupper(str_replace(' ', '_', $u['plan_name'])),
            'tierClass' => $u['plan_name'] === 'No Plan' ? 'no-plan' : 'starter',
            'status' => $u['status'] === 'active' ? 'Active' : 'Pending Verification',
            'registered' => $timeAgo,
            'seed' => (string)$u['id'],
        ];
    }

    // Revenue breakdown - real data grouped by plan
    $revStmt = $db->query("
        SELECT
            CASE
                WHEN sp.name = 'Starter' THEN 'Starter Plan'
                WHEN sp.name = 'Pro' THEN 'Pro Plan'
                WHEN sp.name = 'Elite' THEN 'Elite Plan'
                ELSE 'Other Plans'
            END as label,
            COALESCE(SUM(
                CASE WHEN us.billing = 'yearly' THEN sp.price_yearly / 12 ELSE sp.price_monthly END
            ), 0) as revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
        GROUP BY sp.name
        ORDER BY revenue DESC
    ");
    $revRows = $revStmt->fetchAll();
    $totalRev = array_sum(array_column($revRows, 'revenue')) ?: 1;
    $revColors = ['green', 'blue', 'purple'];
    $revenueData = [];
    foreach ($revRows as $i => $r) {
        $revenueData[] = [
            'label' => $r['label'],
            'value' => '$' . number_format((float)$r['revenue'], 0),
            'pct' => round((float)$r['revenue'] / $totalRev * 100),
            'cls' => $revColors[$i] ?? 'gray',
        ];
    }
    if (empty($revenueData)) {
        $revenueData = [
            ['label' => 'Recurring Subscriptions', 'value' => '$0', 'pct' => 100, 'cls' => 'green'],
        ];
    }

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

    // Combined session counts (2 queries → 1)
    $sessionRow = $db->query("
        SELECT
            (SELECT COUNT(*) FROM sessions WHERE status = 'completed') as completed_sessions,
            (SELECT COUNT(*) FROM sessions) as total_sessions
    ")->fetch();
    $completedSessions = (int)$sessionRow['completed_sessions'];
    $totalSessions = (int)$sessionRow['total_sessions'];
    $completionRate = $totalSessions > 0 ? round($completedSessions / $totalSessions * 100, 1) : 0;

    $activeRatio = $totalUsers > 0 ? round($activeUsers / $totalUsers * 100) : 0;
    $infrastructure = [
        ['label' => 'Active User Rate', 'value' => $activeRatio . '%', 'pct' => $activeRatio, 'cls' => 'green'],
        ['label' => 'Subscription Rate', 'value' => round($totalSubsEver / max($totalUsers, 1) * 100) . '%', 'pct' => round($totalSubsEver / max($totalUsers, 1) * 100), 'cls' => 'yellow'],
        ['label' => 'Session Completion', 'value' => $completionRate . '%', 'pct' => $completionRate, 'cls' => 'blue'],
        ['label' => 'Coach Approval Rate', 'value' => '100%', 'pct' => 100, 'cls' => 'purple'],
    ];

    // Security data
    $activeSessionsSec = (int)$db->query("SELECT COUNT(*) FROM users WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND status = 'active'")->fetchColumn();
    $blockedAttemptsSec = (int)$db->query("SELECT COUNT(*) FROM login_throttle WHERE locked_until IS NOT NULL AND locked_until >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
    $warningsSec = (int)$db->query("SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('suspicious_login', 'failed_access', 'permission_denied') AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $adminCountSec = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn();
    $verifyRateSec = $totalUsers > 0 ? round((int)$db->query("SELECT COUNT(*) FROM users WHERE email_verified_at IS NOT NULL")->fetchColumn() / $totalUsers * 100) : 100;
    $secScore = 'A+';
    if ($verifyRateSec < 50 || $blockedAttemptsSec > 100) $secScore = 'B';
    if ($verifyRateSec < 30 || $blockedAttemptsSec > 500) $secScore = 'C';
    if ($blockedAttemptsSec > 1000) $secScore = 'D';

    success([
        'userName' => $userName,
        'kpis' => [
            'activeUsers' => $activeUsers ?: 0,
            'totalUsers' => $totalUsers,
            'monthlyMRR' => $mrr ?: 0,
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
        'infrastructure' => $infrastructure,
        'security' => [
            'score' => $secScore,
            'activeSessions' => $activeSessionsSec,
            'warnings' => $warningsSec,
            'blockedAttempts' => $blockedAttemptsSec,
            'adminCount' => $adminCountSec,
        ],
    ]);
}

function adminAnalytics(): void {
    requireRole('admin');
    $db = getDB();

    // Users over last 12 months
    $userStmt = $db->query("
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month ORDER BY month
    ");
    $usersByMonth = [];
    foreach ($userStmt as $row) {
        $usersByMonth[] = [
            'month' => date('M Y', strtotime($row['month'] . '-01')),
            'count' => (int)$row['count'],
        ];
    }

    // Revenue over last 12 months
    $revStmt = $db->query("
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(amount), 0) as revenue
        FROM payments
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND status = 'completed'
        GROUP BY month ORDER BY month
    ");
    $revenueByMonth = [];
    foreach ($revStmt as $row) {
        $revenueByMonth[] = [
            'month' => date('M Y', strtotime($row['month'] . '-01')),
            'revenue' => (float)$row['revenue'],
        ];
    }

    // Sessions completed
    $sessionStmt = $db->query("
        SELECT DATE_FORMAT(date, '%Y-%m') as month, COUNT(*) as count
        FROM sessions
        WHERE status = 'completed' AND date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month ORDER BY month
    ");
    $sessionsByMonth = [];
    foreach ($sessionStmt as $row) {
        $sessionsByMonth[] = [
            'month' => date('M Y', strtotime($row['month'] . '-01')),
            'count' => (int)$row['count'],
        ];
    }

    // Role distribution
    $roleStmt = $db->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    $roles = [];
    foreach ($roleStmt as $row) {
        $roles[] = [
            'role' => $row['role'],
            'count' => (int)$row['count'],
        ];
    }

    // Programs count
    $programCount = (int)$db->query("SELECT COUNT(*) FROM programs WHERE status = 'active'")->fetchColumn();

    // Total revenue
    $totalRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'")->fetchColumn();

    // Average session completion rate
    $completedSessions = (int)$db->query("SELECT COUNT(*) FROM sessions WHERE status = 'completed'")->fetchColumn();
    $totalSessions = (int)$db->query("SELECT COUNT(*) FROM sessions")->fetchColumn();
    $completionRate = $totalSessions > 0 ? round($completedSessions / $totalSessions * 100, 1) : 0;

    success([
        'usersByMonth' => $usersByMonth,
        'revenueByMonth' => $revenueByMonth,
        'sessionsByMonth' => $sessionsByMonth,
        'roleDistribution' => $roles,
        'totalUsers' => (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
        'activePrograms' => $programCount,
        'totalRevenue' => $totalRevenue,
        'completionRate' => $completionRate,
        'totalCoaches' => (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'coach'")->fetchColumn(),
        'totalClients' => (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'client'")->fetchColumn(),
    ]);
}

function adminAnalyticsDetailed(): void {
    requireRole('admin');
    $db = getDB();

    $activeByDay = $db->query("SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY day ORDER BY day")->fetchAll();

    $revenueByMonth = $db->query("SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(amount), 0) as revenue FROM payments WHERE status = 'completed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month")->fetchAll();

    $sessionsData = $db->query("SELECT status, COUNT(*) as count FROM sessions WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY status")->fetchAll();

    $topCoaches = $db->query("SELECT t.first_name, t.last_name, ROUND(AVG(r.rating), 1) as avg_rating, COUNT(r.id) as review_count FROM trainers t JOIN reviews r ON r.trainer_id = t.id GROUP BY t.id HAVING review_count > 0 ORDER BY avg_rating DESC LIMIT 10")->fetchAll();

    $ticketData = $db->query("SELECT severity, COUNT(*) as count FROM support_tickets WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY severity")->fetchAll();

    success([
        'activeUsersByDay' => array_map(fn($r) => ['day' => $r['day'], 'count' => (int)$r['count']], $activeByDay),
        'revenueByMonth' => array_map(fn($r) => ['month' => $r['month'], 'revenue' => (float)$r['revenue']], $revenueByMonth),
        'sessionCompletion' => array_map(fn($r) => ['status' => $r['status'], 'count' => (int)$r['count']], $sessionsData),
        'topCoaches' => array_map(fn($r) => ['name' => $r['first_name'] . ' ' . $r['last_name'], 'rating' => (float)$r['avg_rating'], 'reviews' => (int)$r['review_count']], $topCoaches),
        'ticketsBySeverity' => array_map(fn($r) => ['severity' => $r['severity'], 'count' => (int)$r['count']], $ticketData),
    ]);
}

function coachDashboard(): void {
    $auth = requireRole('coach', 'admin');
    $db = getDB();
    $analyticsDays = min(365, max(7, (int)($_GET['days'] ?? 30)));

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
    $clientCount = (int)$activeClientsStmt->fetchColumn();

    $todaySessionsStmt = $db->prepare("
        SELECT COUNT(*) FROM sessions WHERE trainer_id = ? AND date = CURDATE() AND status = 'scheduled'
    ");
    $todaySessionsStmt->execute([$trainerId]);
    $todayCount = (int)$todaySessionsStmt->fetchColumn();

    $avgRatingStmt = $db->prepare("
        SELECT AVG(rating) FROM reviews WHERE trainer_id = ?
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
        SELECT u.id, u.first_name, u.last_name, u.photo, up.progress,
               p.name as program_name
        FROM user_programs up
        JOIN users u ON u.id = up.user_id
        JOIN programs p ON p.id = up.program_id
        WHERE p.trainer_id = ? AND up.status = 'active'
        ORDER BY up.progress DESC LIMIT 5
    ");
    $clientStmt->execute([$trainerId]);
    $clients = [];
    foreach ($clientStmt as $c) {
        $pct = (int)$c['progress'];
        $cls = $pct >= 80 ? 'green' : ($pct >= 40 ? 'yellow' : 'red');
        $clients[] = [
            'name' => $c['first_name'] . ' ' . $c['last_name'],
            'photo' => $c['photo'] ?? '',
            'count' => $pct . '%',
            'countCls' => $cls,
            'pct' => $pct,
            'barCls' => $cls,
            'detail' => $c['program_name'] . ' — ' . $pct . '% complete',
            'seed' => (string)$c['id'],
        ];
    }

    // Programs
    $progStmt = $db->prepare("
        SELECT p.id, p.name, p.enrollments, p.weeks, p.sessions_per_week,
               (SELECT COUNT(*) FROM user_programs up WHERE up.program_id = p.id AND up.started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as recent
        FROM programs p WHERE p.trainer_id = ? AND p.status = 'active' ORDER BY p.enrollments DESC
    ");
    $progStmt->execute([$analyticsDays, $trainerId]);
    $icons = ['Flame', 'Dumbbell', 'Heart', 'Zap'];
    $iconCls = ['orange', 'blue', 'purple', 'green'];
    $programs = [];
    foreach ($progStmt as $i => $p) {
        $totalEnrollments = (int)$p['enrollments'];
        $recentEnrollments = (int)$p['recent'];
        $changePct = $totalEnrollments > 0 ? '+' . round($recentEnrollments / $totalEnrollments * 100) . '%' : '0%';
        $programs[] = [
            'name' => $p['name'],
            'detail' => $p['enrollments'] . ' clients · ' . ($p['weeks'] ?? 12) . ' weeks · ' . ($p['sessions_per_week'] ?? 4) . 'x/week',
            'change' => $changePct,
            'cls' => 'up',
            'icon' => $icons[$i % count($icons)],
            'iconCls' => $iconCls[$i % count($iconCls)],
        ];
    }

    // Completion rate (filtered by analytics days)
    $compRow = $db->prepare("
        SELECT
            (SELECT COUNT(*) FROM sessions WHERE trainer_id = ? AND status = 'completed' AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as completed,
            (SELECT COUNT(*) FROM sessions WHERE trainer_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as total_sess
    ");
    $compRow->execute([$trainerId, $analyticsDays, $trainerId, $analyticsDays]);
    $compData = $compRow->fetch();
    $completed = (int)$compData['completed'];
    $totalSess = (int)$compData['total_sess'];
    $completionRate = $totalSess > 0 ? round($completed / $totalSess * 100) : 0;

    // Reviews / Feedback
    $reviewStmt = $db->prepare("
        SELECT r.rating, r.comment, r.created_at,
               CONCAT(u.first_name, ' ', u.last_name) as user_name, u.id as user_id, u.photo as user_photo
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.trainer_id = ?
        ORDER BY r.created_at DESC LIMIT 10
    ");
    $reviewStmt->execute([$trainerId]);
    $reviews = [];
    $feedback = [];
    $starColors = ['#ef4444','#f97316','#eab308','#22c55e','#22c55e'];
    foreach ($reviewStmt as $r) {
        $starCount = (int)$r['rating'];
        $reviews[] = [
            'name' => $r['user_name'],
            'rating' => $starCount,
            'text' => $r['comment'] ?? 'Great session!',
            'date' => date('M j, Y', strtotime($r['created_at'])),
            'seed' => (string)$r['user_id'],
            'photo' => $r['user_photo'] ?? '',
            'tags' => [],
        ];
        $feedback[] = [
            'name' => $r['user_name'],
            'stars' => $starCount,
            'text' => $r['comment'] ?? 'Great session!',
            'meta' => date('M j, Y', strtotime($r['created_at'])),
            'seed' => (string)$r['user_id'],
            'photo' => $r['user_photo'] ?? '',
        ];
    }
    if (!$reviews) {
        $reviews = [];
        $feedback = [];
    }

    // Full client roster
    $rosterStmt = $db->prepare("
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.photo, up.progress,
               p.name as program_name,
               COALESCE(sp.name, 'No Plan') as plan_name
        FROM user_programs up
        JOIN users u ON u.id = up.user_id
        JOIN programs p ON p.id = up.program_id
        LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE p.trainer_id = ? AND up.status = 'active'
        ORDER BY u.first_name LIMIT 20
    ");
    $rosterStmt->execute([$trainerId]);
    $clientRoster = [];
    foreach ($rosterStmt as $c) {
        $pct = (int)$c['progress'];
        $status = $pct >= 80 ? 'On Track' : ($pct >= 40 ? 'In Progress' : 'Needs Attention');
        $statusCls = $pct >= 80 ? 'on-track' : ($pct >= 40 ? 'in-progress' : 'needs-attention');
        $dotCls = $pct >= 80 ? 'green' : ($pct >= 40 ? 'yellow' : 'red');
        $clientRoster[] = [
            'name' => $c['first_name'] . ' ' . $c['last_name'],
            'photo' => $c['photo'] ?? '',
            'tier' => $c['plan_name'] === 'No Plan' ? 'Free' : $c['plan_name'],
            'prog' => $c['program_name'],
            'progCls' => 'orange',
            'status' => $status,
            'statusCls' => $statusCls,
            'dotCls' => $dotCls,
        ];
    }

    // Attention items (clients with low progress or cancelled sessions)
    $attention = [];
    $lowProgStmt = $db->prepare("
        SELECT u.id, u.first_name, u.last_name, MAX(up.progress) as progress
        FROM user_programs up
        JOIN users u ON u.id = up.user_id
        JOIN programs p ON p.id = up.program_id
        WHERE p.trainer_id = ? AND up.status = 'active'
        GROUP BY u.id HAVING progress < 30 ORDER BY progress LIMIT 3
    ");
    $lowProgStmt->execute([$trainerId]);
    foreach ($lowProgStmt as $lp) {
        $attention[] = [
            'text' => $lp['first_name'] . ' ' . $lp['last_name'] . ' is behind on program progress (' . (int)$lp['progress'] . '%)',
            'sub' => 'Send a check-in message',
            'badge' => 'Behind',
            'badgeCls' => 'missed',
            'iconCls' => 'red',
            'borderCls' => 'red',
            'btnText' => 'Message',
            'btnCls' => 'red',
        ];
    }

    // Recent payouts from payments table
    $payoutStmt = $db->prepare("
        SELECT p.amount, p.created_at, p.status
        FROM payments p
        WHERE p.status = 'completed'
        ORDER BY p.created_at DESC LIMIT 4
    ");
    $payoutStmt->execute();
    $recentPayouts = [];
    foreach ($payoutStmt as $pay) {
        $recentPayouts[] = [
            'date' => date('M j, Y', strtotime($pay['created_at'])),
            'amount' => '$' . number_format((float)$pay['amount'], 0),
            'status' => ucfirst($pay['status']),
        ];
    }


    // Earnings totals
    $earnRow = $db->query("
        SELECT
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as earnings_total,
            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN user_subscriptions us ON us.id = p.subscription_id WHERE p.status = 'completed' AND p.type = 'subscription') as sub_rev,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND type = 'coaching') as coach_rev,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND type = 'product') as prod_rev,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pending') as pending_payout
    ")->fetch();
    $earningsTotal = (float)$earnRow['earnings_total'];
    $subRev = (int)$earnRow['sub_rev'];
    $coachRev = (int)$earnRow['coach_rev'];
    $prodRev = (int)$earnRow['prod_rev'];
    $pendingPayout = (int)$earnRow['pending_payout'];

    // Calculate MoM growth from payments
    $growthRow = $db->query("
        SELECT
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')) as this_month,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')) as last_month
    ")->fetch();
    $thisMonth = (float)$growthRow['this_month'];
    $lastMonth = (float)$growthRow['last_month'];
    $growthPct = $lastMonth > 0 ? round(($thisMonth - $lastMonth) / $lastMonth * 100) : 0;
    $growthText = ($growthPct >= 0 ? '+' : '') . $growthPct . '% MoM';

    $totalEarnings = $subRev + $coachRev + $prodRev ?: 1;

    $earningsBreakdown = [
        ['label' => '1:1 Coaching', 'value' => '$' . number_format($coachRev), 'pct' => round($coachRev / $totalEarnings * 100), 'cls' => 'yellow'],
        ['label' => 'Group Sessions', 'value' => '$' . number_format($subRev), 'pct' => round($subRev / $totalEarnings * 100), 'cls' => 'blue'],
        ['label' => 'Program Royalties', 'value' => '$' . number_format($prodRev), 'pct' => round($prodRev / $totalEarnings * 100), 'cls' => 'purple'],
    ];

    success([
        'userName' => $userName,
        'analyticsDays' => $analyticsDays,
        'kpis' => [
            'activeClients' => $clientCount,
            'todaySessions' => $todayCount,
            'completionRate' => $completionRate,
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
            'breakdown' => $earningsBreakdown,
            'total' => '$' . number_format($earningsTotal),
            'growth' => $growthText,
            'pendingPayout' => '$' . number_format($pendingPayout),
            'sessionsDelivered' => array_sum($weekCounts),
        ],
        'clientRoster' => $clientRoster,
        'reviews' => $reviews,
        'feedback' => $feedback,
        'attention' => $attention,
        'recentPayouts' => $recentPayouts,
    ]);
}

function clientDashboard(): void {
    $auth = requireRole('client', 'coach', 'admin');
    $userId = $auth['sub'];
    $db = getDB();

    $nutrition = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? AND log_date = ?");
    $nutrition->execute([$userId, date('Y-m-d')]);
    $nutritionData = $nutrition->fetch() ?: [];

    $calories = $nutritionData ? (int)$nutritionData['calories_consumed'] : 0;

    $thisMonth = date('Y-m-01');
    $workoutsDoneStmt = $db->prepare("
        SELECT COUNT(*) FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE sp.user_id = ? AND sp.status = 'completed' AND s.date >= ?
    ");
    $workoutsDoneStmt->execute([$userId, $thisMonth]);
    $workoutsDone = (int)$workoutsDoneStmt->fetchColumn();

    $workoutTarget = 16;
    $totalHours = 0;
    $streak = 0;

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

    if ($activeProg) {
        $workoutTarget = ((int)($activeProg['sessions_per_week'] ?? 4)) * 4;
        $hoursStmt = $db->prepare("
            SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time)) / 3600), 0)
            FROM session_participants sp
            JOIN sessions s ON s.id = sp.session_id
            WHERE sp.user_id = ? AND sp.status = 'completed' AND s.date >= ? AND s.start_time IS NOT NULL AND s.end_time IS NOT NULL
        ");
        $hoursStmt->execute([$userId, $thisMonth]);
        $totalHours = round((float)$hoursStmt->fetchColumn(), 1);
    }

    $streakStmt = $db->prepare("
        SELECT checkin_date FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 60
    ");
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

    $avgRpeStmt = $db->prepare("
        SELECT ROUND(AVG(s.rpe), 1) FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE sp.user_id = ? AND sp.status = 'completed' AND s.rpe IS NOT NULL
    ");
    $avgRpeStmt->execute([$userId]);
    $avgRPE = $avgRpeStmt->fetchColumn() ?: 0;

    $activeProgram = $activeProg ? [
        'name' => $activeProg['name'],
        'coach' => $activeProg['coach_name'] ?? 'Alex Rivera',
        'duration' => ($activeProg['duration_minutes'] ?? '40 min') . ' sessions · ' . ($activeProg['sessions_per_week'] ?? 4) . 'x/week',
        'week' => 'Week ' . ($activeProg['current_week'] ?? 6) . '/' . ($activeProg['weeks'] ?? 12),
        'progress' => (int)($activeProg['progress'] ?? 50),
        'workoutsDone' => $workoutsDone . '/' . $workoutTarget,
        'avgRPE' => $avgRPE . '/10',
    ] : null;

    $macros = $nutritionData ? [
        'target' => number_format($nutritionData['calories_target'] ?? 0) . ' kcal',
        'totalConsumed' => number_format($nutritionData['calories_consumed'] ?? 0) . ' kcal',
        'protein' => [
            'current' => (float)($nutritionData['protein_current'] ?? 0),
            'target' => (float)($nutritionData['protein_target'] ?? 0),
            'pct' => $nutritionData['protein_target'] ? round(($nutritionData['protein_current'] ?? 0) / $nutritionData['protein_target'] * 100) . '%' : '0%',
        ],
        'carbs' => [
            'current' => (float)($nutritionData['carbs_current'] ?? 0),
            'target' => (float)($nutritionData['carbs_target'] ?? 0),
            'pct' => $nutritionData['carbs_target'] ? round(($nutritionData['carbs_current'] ?? 0) / $nutritionData['carbs_target'] * 100) . '%' : '0%',
        ],
        'fat' => [
            'current' => (float)($nutritionData['fat_current'] ?? 0),
            'target' => (float)($nutritionData['fat_target'] ?? 0),
            'pct' => $nutritionData['fat_target'] ? round(($nutritionData['fat_current'] ?? 0) / $nutritionData['fat_target'] * 100) . '%' : '0%',
        ],
    ] : null;

    $waterCount = $nutritionData ? (int)$nutritionData['water_glasses'] : 0;

    $meals = [];
    $mealChecked = [];

    $metricStmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 1");
    $metricStmt->execute([$userId]);
    $metricsRow = $metricStmt->fetch();

    $metrics = $metricsRow ? [
        'weight' => ['value' => (float)$metricsRow['weight_kg'], 'unit' => 'kg', 'change' => '-0.4 kg', 'direction' => 'down'],
        'bodyFat' => ['value' => (float)$metricsRow['body_fat_pct'], 'unit' => '%', 'change' => '-0.8%', 'direction' => 'down'],
        'muscle' => ['value' => (float)$metricsRow['muscle_kg'], 'unit' => 'kg', 'change' => '+0.3 kg', 'direction' => 'up'],
        'bmi' => ['value' => (float)$metricsRow['bmi'], 'unit' => '', 'change' => 'Normal', 'direction' => 'up'],
    ] : null;

    $achStmt = $db->prepare("
        SELECT a.*, ua.achievement_id IS NOT NULL as unlocked
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        ORDER BY a.sort_order
    ");
    $achStmt->execute([$userId]);

    $achievements = [];
    $colors = ['orange', 'yellow', 'blue', 'green', 'purple', 'cyan', 'pink', 'dim'];
    foreach ($achStmt as $i => $a) {
        $achievements[] = [
            'label' => $a['label'],
            'icon' => $a['icon'] ?? 'Award',
            'color' => $colors[$i] ?? 'dim',
            'locked' => !$a['unlocked'],
        ];
    }

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

    $nextWorkoutStmt = $db->prepare("
        SELECT s.id, s.title, s.date, s.start_time, CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id AND s.status = 'scheduled' AND s.date >= CURDATE()
        LEFT JOIN trainers t ON t.id = s.trainer_id
        WHERE sp.user_id = ? AND sp.status = 'registered'
        ORDER BY s.date ASC, s.start_time ASC LIMIT 1
    ");
    $nextWorkoutStmt->execute([$userId]);
    $nextRow = $nextWorkoutStmt->fetch();
    $nextWorkout = $nextRow ? [
        'id' => (int)$nextRow['id'],
        'title' => $nextRow['title'],
        'date' => $nextRow['date'],
        'time' => $nextRow['start_time'] ? date('H:i', strtotime($nextRow['start_time'])) : null,
        'trainer' => $nextRow['trainer_name'] ?? 'Alex Rivera',
    ] : null;

    $notifStmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
    $notifStmt->execute([$userId]);
    $notifications = [];
    foreach ($notifStmt as $n) {
        $notifications[] = [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'title' => $n['title'],
            'message' => $n['message'],
            'icon' => $n['icon'],
            'link' => $n['link'],
            'read' => (bool)$n['is_read'],
            'createdAt' => $n['created_at'],
        ];
    }

    $userName = $db->prepare("SELECT first_name FROM users WHERE id = ?");
    $userName->execute([$userId]);
    $userName = $userName->fetchColumn() ?: 'Athlete';

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
        'notifications' => $notifications,
        'nextWorkout' => $nextWorkout,
    ]);
}
