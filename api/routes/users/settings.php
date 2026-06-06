<?php

function getSettings(int $userId): array {
    $db = getDB();

    $stmt = $db->prepare("SELECT settings FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        error('Usuario no encontrado', 404);
    }

    $defaults = [
        'notifications_email' => true,
        'notifications_push' => true,
        'notifications_sms' => false,
        'language' => 'es',
        'theme' => 'dark',
        'timezone' => 'America/Mexico_City',
        'measurement_unit' => 'metric',
        'privacy_profile_public' => true,
        'privacy_show_progress' => true,
    ];

    $saved = $row['settings'] ? json_decode($row['settings'], true) : [];

    return array_merge($defaults, $saved ?: []);
}

function updateSettings(int $userId, array $data): void {
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        error('Usuario no encontrado', 404);
    }

    $allowed = [
        'notifications_email', 'notifications_push', 'notifications_sms',
        'language', 'theme', 'timezone', 'measurement_unit',
        'privacy_profile_public', 'privacy_show_progress',
    ];

    $current = getSettings($userId);

    foreach ($data as $key => $value) {
        if (in_array($key, $allowed, true)) {
            if (in_array($key, ['notifications_email', 'notifications_push', 'notifications_sms', 'privacy_profile_public', 'privacy_show_progress'], true)) {
                $current[$key] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
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
    success(getSettings((int)$auth['sub']), 'Ajustes actualizados');
}
