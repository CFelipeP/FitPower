<?php
function listLeaderboard(): void {
    $auth = tryAuth();
    $db = getDB();
    $period = $_GET['period'] ?? 'total';
    $limit = min((int)($_GET['limit'] ?? 100), 200);
    
    $orderBy = match($period) {
        'workouts' => 'workouts_completed DESC',
        'streak' => 'streak_days DESC',
        'calories' => 'total_calories_burned DESC',
        'points' => 'total_points DESC',
        default => 'total_points DESC',
    };
    
    $stmt = $db->query("
        SELECT 
            le.*,
            u.id as user_id,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.photo,
            COALESCE(ua.cnt, 0) as achievements_count,
            COALESCE(f.cnt, 0) as followers_count,
            COALESCE(sp.cnt, 0) as posts_count
        FROM leaderboard_entries le
        JOIN users u ON le.user_id = u.id
        LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM user_achievements GROUP BY user_id) ua ON ua.user_id = le.user_id
        LEFT JOIN (SELECT following_id, COUNT(*) as cnt FROM followers GROUP BY following_id) f ON f.following_id = le.user_id
        LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM social_posts GROUP BY user_id) sp ON sp.user_id = le.user_id
        ORDER BY $orderBy
        LIMIT $limit
    ");
    
    $entries = $stmt->fetchAll();
    $rank = 1;
    $userRank = null;
    
    foreach ($entries as &$entry) {
        $entry['rank'] = $rank++;
        if ($auth && $entry['user_id'] == $auth['sub']) {
            $userRank = $entry;
        }
    }
    
    $result = [
        'entries' => $entries,
        'userRank' => $userRank,
        'total_count' => (int)$db->query("SELECT COUNT(*) FROM leaderboard_entries")->fetchColumn(),
    ];
    
    success($result);
}

function getLeaderboardStats() {
    $db = getDB();
    
    $totalUsers = $db->query("SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'active'")->fetchColumn();
    $totalWorkouts = $db->query("SELECT SUM(workouts_completed) FROM leaderboard_entries")->fetchColumn() ?: 0;
    $totalPoints = $db->query("SELECT SUM(total_points) FROM leaderboard_entries")->fetchColumn() ?: 0;
    $topStreak = $db->query("SELECT MAX(streak_days) FROM leaderboard_entries")->fetchColumn() ?: 0;
    
    success([
        'total_users' => (int)$totalUsers,
        'total_workouts' => (int)$totalWorkouts,
        'total_points' => (int)$totalPoints,
        'top_streak' => (int)$topStreak,
    ]);
}

function getLeaderboardByMuscle() {
    $auth = tryAuth();
    $db = getDB();
    
    $stmt = $db->query("
        SELECT 
            el.muscle_group,
            COUNT(DISTINCT s.user_id) as athletes,
            SUM(e.sets) as total_sets,
            SUM(e.reps) as total_reps,
            SUM(e.weight * e.sets * e.reps) as total_volume
        FROM exercises e
        JOIN sessions s ON e.session_id = s.id
        JOIN exercise_library el ON e.name = el.name
        WHERE s.status = 'completed'
        GROUP BY el.muscle_group
        ORDER BY total_volume DESC
    ");
    
    success($stmt->fetchAll());
}

function updateLeaderboardPoints(int $userId, string $type, int $points = 0): void {
    $db = getDB();
    $validColumns = ['forum_posts', 'workouts_completed', 'streak_days', 'total_calories_burned', 'sessions_attended', 'reviews_written'];
    if (!in_array($type, $validColumns)) return;

    $stmt = $db->prepare("SELECT id FROM leaderboard_entries WHERE user_id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        $db->prepare("INSERT INTO leaderboard_entries (user_id, total_points, $type) VALUES (?, ?, ?)")
            ->execute([$userId, $points, $points]);
    } else {
        $db->prepare("UPDATE leaderboard_entries SET total_points = total_points + ?, $type = $type + ? WHERE user_id = ?")
            ->execute([$points, $points, $userId]);
    }
}

function createLeaderboardEntry(int $userId): void {
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM leaderboard_entries WHERE user_id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        $db->prepare("INSERT INTO leaderboard_entries (user_id) VALUES (?)")->execute([$userId]);
    }
}
