<?php
/**
 * StreakService — the single source of truth for workout streaks.
 *
 * Rule: a streak is built from days with at least one COMPLETED workout
 * (workout_logs rows or sessions marked completed for the user). A streak is
 * still alive if the last workout was yesterday; it resets after 2+ missed
 * days. A monthly freeze covers a single missed day without breaking the
 * streak.
 */

function getCompletedWorkoutDates(PDO $db, int $userId): array {
    $dates = [];

    $logStmt = $db->prepare("SELECT DISTINCT DATE(logged_at) FROM workout_logs WHERE user_id = ?");
    $logStmt->execute([$userId]);
    foreach ($logStmt->fetchAll(PDO::FETCH_COLUMN) as $d) {
        $dates[$d] = true;
    }

    $ownStmt = $db->prepare("SELECT DISTINCT s.date FROM sessions s WHERE s.user_id = ? AND s.status = 'completed' AND s.date IS NOT NULL");
    $ownStmt->execute([$userId]);
    foreach ($ownStmt->fetchAll(PDO::FETCH_COLUMN) as $d) {
        $dates[$d] = true;
    }

    $partStmt = $db->prepare("
        SELECT DISTINCT s.date
        FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE sp.user_id = ? AND sp.status = 'completed' AND s.date IS NOT NULL
    ");
    $partStmt->execute([$userId]);
    foreach ($partStmt->fetchAll(PDO::FETCH_COLUMN) as $d) {
        $dates[$d] = true;
    }

    $frozen = [];
    $freezeStmt = $db->prepare("SELECT frozen_date FROM streak_freezes WHERE user_id = ?");
    $freezeStmt->execute([$userId]);
    foreach ($freezeStmt->fetchAll(PDO::FETCH_COLUMN) as $d) {
        $dates[$d] = true; // a frozen day counts as a protected day
        $frozen[$d] = true;
    }

    ksort($dates);
    return array_keys($dates);
}

/**
 * @return array{streak:int,lastDate:?string,atRisk:bool,freezeAvailable:bool,freezesThisMonth:int}
 */
function computeStreak(PDO $db, int $userId): array {
    $dates = getCompletedWorkoutDates($db, $userId);
    $today = new DateTime('today');
    $streak = 0;
    $lastDate = null;

    if (empty($dates)) {
        return ['streak' => 0, 'lastDate' => null, 'atRisk' => false, 'freezeAvailable' => false, 'freezesThisMonth' => 0];
    }

    $lastDate = $dates[count($dates) - 1];
    $expected = new DateTime($lastDate);
    $todayStr = $today->format('Y-m-d');
    $yesterdayStr = (clone $today)->modify('-1 day')->format('Y-m-d');

    // Streak is alive if the last workout was today or yesterday.
    if ($expected->format('Y-m-d') !== $todayStr && $expected->format('Y-m-d') !== $yesterdayStr) {
        return ['streak' => 0, 'lastDate' => $lastDate, 'atRisk' => false, 'freezeAvailable' => freezesAvailable($db, $userId), 'freezesThisMonth' => freezesThisMonth($db, $userId)];
    }

    $streak = 1;
    for ($i = count($dates) - 2; $i >= 0; $i--) {
        $prev = new DateTime($dates[$i]);
        $diff = (int)$expected->diff($prev)->days;
        if ($diff === 1) {
            $streak++;
            $expected = $prev;
        } else {
            break;
        }
    }

    return [
        'streak' => $streak,
        'lastDate' => $lastDate,
        'atRisk' => $streak >= 3 && $lastDate !== $todayStr,
        'freezeAvailable' => $streak >= 1 && $lastDate !== $todayStr && freezesAvailable($db, $userId),
        'freezesThisMonth' => freezesThisMonth($db, $userId),
    ];
}

function freezesThisMonth(PDO $db, int $userId): int {
    $stmt = $db->prepare("SELECT COUNT(*) FROM streak_freezes WHERE user_id = ? AND frozen_date >= DATE_FORMAT(NOW(), '%Y-%m-01')");
    $stmt->execute([$userId]);
    return (int)$stmt->fetchColumn();
}

function freezesAvailable(PDO $db, int $userId): bool {
    return freezesThisMonth($db, $userId) < 1;
}

/**
 * Keeps leaderboard_entries.streak_days in sync with the single streak source.
 */
function updateLeaderboardStreak(PDO $db, int $userId): int {
    $streak = computeStreak($db, $userId)['streak'];
    $db->prepare("INSERT INTO leaderboard_entries (user_id, total_points, streak_days, updated_at)
        VALUES (?, 0, ?, NOW())
        ON DUPLICATE KEY UPDATE streak_days = ?, updated_at = NOW()")
        ->execute([$userId, $streak, $streak]);
    return $streak;
}

function freezeStreak(PDO $db, int $userId): array {
    $info = computeStreak($db, $userId);
    if ($info['streak'] < 1) {
        return ['ok' => false, 'message' => 'You do not have an active streak to protect'];
    }
    if ($info['lastDate'] === date('Y-m-d')) {
        return ['ok' => false, 'message' => 'You already trained today — your streak is safe!'];
    }
    if (!freezesAvailable($db, $userId)) {
        return ['ok' => false, 'message' => 'You already used your freeze this month'];
    }
    $stmt = $db->prepare("INSERT IGNORE INTO streak_freezes (user_id, frozen_date) VALUES (?, ?)");
    $stmt->execute([$userId, date('Y-m-d')]);
    if ($stmt->rowCount() === 0) {
        return ['ok' => false, 'message' => 'Today is already protected'];
    }
    return ['ok' => true, 'message' => 'Streak protected for today', 'streak' => computeStreak($db, $userId)['streak']];
}
