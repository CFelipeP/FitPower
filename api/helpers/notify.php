<?php

function sendNotificationWithEmail(int $userId, string $type, string $title, string $message, string $link = ''): void {
    $db = getDB();
    // Insert in-app notification
    $stmt = $db->prepare("INSERT INTO notifications (user_id, type, title, message, link, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$userId, $type, $title, $message, $link]);
    
    // Send email notification if user has email notifications enabled
    try {
        if (file_exists(__DIR__ . '/mailer.php')) {
            require_once __DIR__ . '/mailer.php';
            $user = $db->prepare("SELECT email, first_name, settings FROM users WHERE id = ?");
            $user->execute([$userId]);
            $u = $user->fetch();
            if ($u) {
                $settings = json_decode($u['settings'] ?? '{}', true);
                $emailNotifs = $settings['emailNotifications'] ?? true;
                if ($emailNotifs) {
                    sendNotificationEmail($u['email'], $u['first_name'], $title, $message, $link);
                }
            }
        }
    } catch (\Throwable $e) {}
}

/**
 * Best-effort user notification (in-app + optional email/push). This function
 * MUST never throw: it runs after payments/subscriptions commit, and a broken
 * notification must not turn a successful payment response into a 500.
 */
function notifyUser($db, int $userId, string $type, string $title, string $message, string $icon = '', string $link = '', array $opts = []): void {
    try {
        $stmt = $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, icon_color, link, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, NOW())");
        $stmt->execute([$userId, $type, $title, $message, $icon, $link]);
        if (!empty($opts['email'])) {
            sendNotificationWithEmail($userId, $type, $title, $message, $link);
        }
    } catch (\Throwable $e) {
        error_log('notifyUser failed (non-fatal): ' . $e->getMessage());
    }
}
