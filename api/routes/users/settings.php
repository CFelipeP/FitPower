<?php

function getSettings(int $userId): array {
    $db = getDB();

    $stmt = $db->prepare("SELECT settings, first_name FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        error('User not found', 404);
    }

    $defaults = [
        'notifications_email' => true,
        'notifications_push' => true,
        'notifications_sms' => false,
        'notifications_inapp' => true,
        'notifications_push_workout' => true,
        'notifications_push_coach' => true,
        'notifications_push_payments' => true,
        'notifications_push_achievements' => true,
        'notifications_push_system' => true,
        'language' => 'en',
        'theme' => 'dark',
        'timezone' => 'America/Mexico_City',
        'measurement_unit' => 'metric',
        'privacy_profile_public' => true,
        'privacy_show_progress' => true,
    ];

    $saved = $row['settings'] ? json_decode($row['settings'], true) : [];
    if (!is_array($saved)) $saved = [];

    $merged = array_merge($defaults, $saved);
    $merged['firstName'] = $row['first_name'] ?? '';

    return $merged;
}

function updateSettings(int $userId, array $data): void {
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        error('User not found', 404);
    }

    $allowed = [
        'notifications_email', 'notifications_push', 'notifications_sms',
        'notifications_inapp',
        'notifications_push_workout', 'notifications_push_coach',
        'notifications_push_payments', 'notifications_push_achievements',
        'notifications_push_system',
        'language', 'theme', 'timezone', 'measurement_unit',
        'privacy_profile_public', 'privacy_show_progress',
    ];

    $enumKeys = [
        'language' => ['en'],
        'theme' => ['dark'],
        'measurement_unit' => ['metric', 'imperial'],
    ];

    $booleanKeys = [
        'notifications_email', 'notifications_push', 'notifications_sms',
        'notifications_inapp',
        'notifications_push_workout', 'notifications_push_coach',
        'notifications_push_payments', 'notifications_push_achievements',
        'notifications_push_system',
        'privacy_profile_public', 'privacy_show_progress',
    ];

    $current = getSettings($userId);
    // firstName comes from the users row, not settings JSON.
    unset($current['firstName']);

    foreach ($data as $key => $value) {
        if (in_array($key, $allowed, true)) {
            if (in_array($key, $booleanKeys, true)) {
                $current[$key] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
            } elseif (isset($enumKeys[$key])) {
                $v = is_string($value) ? strtolower(trim($value)) : '';
                if (in_array($v, $enumKeys[$key], true)) {
                    $current[$key] = $v;
                }
                // invalid enum values are silently ignored
            } elseif ($key === 'timezone') {
                if (is_string($value) && strlen($value) <= 64 && trim($value) !== '') {
                    $current[$key] = trim($value);
                }
            } else {
                $current[$key] = $value;
            }
        }
    }

    $stmt = $db->prepare("UPDATE users SET settings = ? WHERE id = ?");
    $stmt->execute([json_encode($current), $userId]);
}

function handleGetSettings(): void {
    $auth = requireAuth();
    $settings = getSettings((int)$auth['sub']);
    success($settings);
}

function handleUpdateSettings(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    updateSettings((int)$auth['sub'], $input);
    success(getSettings((int)$auth['sub']), 'Settings updated');
}
