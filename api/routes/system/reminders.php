<?php

function processReminders() {
    $db = getDB();
    $notified = [];

    $mailerAvailable = file_exists(__DIR__ . '/../../helpers/mailer.php');
    if ($mailerAvailable) {
        require_once __DIR__ . '/../../helpers/mailer.php';
    }

    // 1. Check-in reminders (users who haven't checked in today)
    $today = date('Y-m-d');
    $stmt = $db->query("
        SELECT u.id, u.email, u.first_name, u.settings 
        FROM users u 
        WHERE u.role = 'client' 
        AND u.id NOT IN (
            SELECT user_id FROM daily_checkins WHERE DATE(created_at) = '$today'
        )
        AND u.status = 'active'
        LIMIT 50
    ");
    while ($user = $stmt->fetch()) {
        $settings = json_decode($user['settings'] ?? '{}', true);
        $emailNotifs = $settings['emailNotifications'] ?? true;
        $inAppNotifs = $settings['inAppNotifications'] ?? true;
        
        if ($inAppNotifs) {
            $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) 
                VALUES (?, 'reminder', 'Daily Check-in Reminder', 'Don\'t forget to complete your daily check-in!', 'Heart', '/client/dashboard', NOW())")
                ->execute([$user['id']]);
        }
        if ($emailNotifs && $mailerAvailable) {
            try {
                sendNotificationEmail($user['email'], $user['first_name'], 
                    'Daily Check-in Reminder',
                    "Hi {$user['first_name']}, don't forget to complete your daily check-in! Track your energy, mood, and meals to stay on top of your goals.",
                    APP_URL . '/client/dashboard');
            } catch (\Throwable $e) {}
        }
        $notified[] = $user['id'];
    }
    
    // 2. Upcoming session reminders (1 hour before)
    $inOneHour = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $now = date('Y-m-d H:i:s');
    $stmt = $db->query("
        SELECT s.id as session_id, s.title, s.date, u.id as user_id, u.email, u.first_name, u.settings
        FROM sessions s
        JOIN session_participants sp ON s.id = sp.session_id
        JOIN users u ON sp.user_id = u.id
        WHERE s.date BETWEEN '$now' AND '$inOneHour'
        AND sp.reminded = 0
        LIMIT 50
    ");
    while ($row = $stmt->fetch()) {
        $settings = json_decode($row['settings'] ?? '{}', true);
        $emailNotifs = $settings['emailNotifications'] ?? true;
        $inAppNotifs = $settings['inAppNotifications'] ?? true;
        
        if ($inAppNotifs) {
            $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) 
                VALUES (?, 'workout', 'Workout Starting Soon', 'Your session \"{$row['title']}\" starts in 1 hour!', 'Dumbbell', '/client/dashboard', NOW())")
                ->execute([$row['user_id']]);
        }
        if ($emailNotifs && $mailerAvailable) {
            try {
                sendNotificationEmail($row['email'], $row['first_name'],
                    'Workout Starting Soon',
                    "Your session \"{$row['title']}\" starts in 1 hour! Get ready to train.",
                    APP_URL . '/client/dashboard');
            } catch (\Throwable $e) {}
        }
        $db->prepare("UPDATE session_participants SET reminded = 1 WHERE session_id = ? AND user_id = ?")
            ->execute([$row['session_id'], $row['user_id']]);
        $notified[] = $row['user_id'];
    }
    
    success(['notified_count' => count(array_unique($notified))]);
}
