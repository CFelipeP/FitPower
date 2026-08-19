<?php

/**
 * Weekly summary (internal cron endpoint): sends every active client a real
 * recap of their week — workouts, sets, calories, streak, goals and new
 * achievements. Respects notification preferences via the central notifier.
 */
function sendWeeklySummaries(): void {
    $secret = INTERNAL_API_SECRET;
    if ($secret === '') {
        error('Cron not configured: define INTERNAL_API_SECRET', 503);
    }
    if (!hash_equals($secret, $_SERVER['HTTP_X_INTERNAL_SECRET'] ?? '')) {
        error('Access denied', 403);
    }

    $db = getDB();
    require_once __DIR__ . '/../../helpers/notify.php';
    require_once __DIR__ . '/../../helpers/streak.php';

    $since = date('Y-m-d H:i:s', strtotime('-7 days'));

    $users = $db->prepare("
        SELECT DISTINCT u.id
        FROM users u
        WHERE u.role = 'client'
        AND u.status = 'active'
        AND EXISTS (
            SELECT 1 FROM workout_logs wl WHERE wl.user_id = u.id AND wl.logged_at >= ?
        )
        LIMIT 500
    ");
    $users->execute([$since]);
    $sent = 0;

    foreach ($users->fetchAll(PDO::FETCH_COLUMN) as $userId) {
        $userId = (int)$userId;

        $statsStmt = $db->prepare("
            SELECT
                COUNT(*) as workouts,
                COALESCE(SUM(sets_completed), 0) as sets,
                COALESCE(SUM(calories_burned), 0) as calories
            FROM workout_logs
            WHERE user_id = ? AND logged_at >= ?
        ");
        $statsStmt->execute([$userId, $since]);
        $stats = $statsStmt->fetch();

        $goalsStmt = $db->prepare("SELECT COUNT(*) FROM client_goals WHERE user_id = ? AND status = 'completed' AND updated_at >= ?");
        $goalsStmt->execute([$userId, $since]);
        $goalsCompleted = (int)$goalsStmt->fetchColumn();

        $achStmt = $db->prepare("SELECT COUNT(*) FROM user_achievements WHERE user_id = ? AND unlocked_at >= ?");
        $achStmt->execute([$userId, $since]);
        $newAchievements = (int)$achStmt->fetchColumn();

        $streak = computeStreak($db, $userId)['streak'];

        $parts = [];
        $parts[] = (int)$stats['workouts'] . ' workout' . ((int)$stats['workouts'] === 1 ? '' : 's');
        $parts[] = (int)$stats['sets'] . ' sets';
        if ((int)$stats['calories'] > 0) $parts[] = (int)$stats['calories'] . ' kcal';
        $parts[] = $streak . '-day streak';
        if ($goalsCompleted > 0) $parts[] = $goalsCompleted . ' goal' . ($goalsCompleted === 1 ? '' : 's') . ' completed';
        if ($newAchievements > 0) $parts[] = $newAchievements . ' new achievement' . ($newAchievements === 1 ? '' : 's');

        $message = 'Your week: ' . implode(' · ', $parts) . '. Keep the momentum going!';

        notifyUser($db, $userId, 'weekly_summary', 'Your weekly summary', $message, 'BarChart3', '/client/dashboard', ['email' => true]);
        $sent++;
    }

    success(['sent' => $sent]);
}
