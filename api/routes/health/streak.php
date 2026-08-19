<?php
/**
 * Streak routes — QA-audit fix: ClientDashboard called POST /streak/freeze
 * which did not exist. The streak logic lives in helpers/streak.php.
 */

function freezeMyStreak(): void {
    $auth = requireAuth();
    require_once __DIR__ . '/../../helpers/streak.php';
    $result = freezeStreak(getDB(), (int)$auth['sub']);
    if (empty($result['ok'])) {
        error($result['message'] ?? 'Could not freeze the streak', 400);
    }
    success(['streak' => $result['streak'] ?? null], $result['message']);
}
