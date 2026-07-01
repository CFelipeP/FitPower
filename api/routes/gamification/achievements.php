<?php

function listAchievements() {
    $auth = requireAuth();
    $db = getDB();
    $userId = $auth['sub'];
    
    $achievements = $db->query("SELECT * FROM achievements ORDER BY type, requirement")->fetchAll();
    
    $userAch = $db->prepare("SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?");
    $userAch->execute([$userId]);
    $unlocked = [];
    foreach ($userAch->fetchAll() as $ua) {
        $unlocked[$ua['achievement_id']] = $ua['unlocked_at'];
    }
    
    $result = [];
    foreach ($achievements as $ach) {
        $ach['unlocked'] = isset($unlocked[$ach['id']]);
        $ach['unlocked_at'] = $unlocked[$ach['id']] ?? null;
        $result[] = $ach;
    }
    
    success($result);
}

function getUserAchievements() {
    $auth = requireAuth();
    $db = getDB();
    $userId = $auth['sub'];
    $stmt = $db->prepare("
        SELECT a.*, ua.unlocked_at 
        FROM achievements a 
        JOIN user_achievements ua ON a.id = ua.achievement_id 
        WHERE ua.user_id = ?
        ORDER BY ua.unlocked_at DESC
    ");
    $stmt->execute([$userId]);
    success($stmt->fetchAll());
}

function checkAndUnlockAchievements() {
    $auth = requireAuth();
    $db = getDB();
    $userId = $auth['sub'];
    
    $entry = $db->prepare("SELECT * FROM leaderboard_entries WHERE user_id = ?");
    $entry->execute([$userId]);
    $stats = $entry->fetch();
    if (!$stats) return [];
    
    $allAch = $db->query("SELECT * FROM achievements")->fetchAll();
    $userAch = $db->prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?");
    $userAch->execute([$userId]);
    $have = array_column($userAch->fetchAll(), 'achievement_id');
    
    $newUnlocks = [];
    foreach ($allAch as $ach) {
        if (in_array($ach['id'], $have)) continue;
        
        $unlock = false;
        switch ($ach['type']) {
            case 'workouts':
                $unlock = ($stats['workouts_completed'] ?? 0) >= $ach['requirement'];
                break;
            case 'streak':
                $unlock = ($stats['streak_days'] ?? 0) >= $ach['requirement'];
                break;
            case 'points':
                $unlock = ($stats['total_points'] ?? 0) >= $ach['requirement'];
                break;
            case 'calories':
                $unlock = ($stats['total_calories_burned'] ?? 0) >= $ach['requirement'];
                break;
            case 'social':
                $forum = $db->prepare("SELECT COUNT(*) as cnt FROM forum_replies WHERE user_id = ?");
                $forum->execute([$userId]);
                $unlock = $forum->fetch()['cnt'] >= $ach['requirement'];
                break;
        }
        
        if ($unlock) {
            $ins = $db->prepare("INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, NOW())");
            $ins->execute([$userId, $ach['id']]);
            
            $db->prepare("UPDATE leaderboard_entries SET total_points = total_points + ? WHERE user_id = ?")->execute([$ach['points'], $userId]);
            
            $newUnlocks[] = $ach;
        }
    }
    
    return $newUnlocks;
}

function checkAchievements() {
    $new = checkAndUnlockAchievements();
    success(['new_achievements' => $new]);
}
