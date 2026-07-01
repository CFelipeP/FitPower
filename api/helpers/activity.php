<?php

function logActivity(int $userId, string $type, string $description, string $icon = 'Activity', string $iconColor = '#3b82f6', ?string $badgeText = null, ?string $badgeClass = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO activities (user_id, type, description, icon, icon_color, badge_text, badge_class) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $type, $description, $icon, $iconColor, $badgeText, $badgeClass]);
    } catch (\PDOException $e) {}
}
