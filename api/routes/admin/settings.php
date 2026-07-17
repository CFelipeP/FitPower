<?php

function adminGetSettings(): void {
    requireRole('admin');
    $db = getDB();
    $stmt = $db->query("SELECT setting_key, setting_value, description FROM platform_settings ORDER BY id");
    $settings = [];
    foreach ($stmt as $row) {
        $settings[] = [
            'key' => $row['setting_key'],
            'value' => $row['setting_value'],
            'description' => $row['description'],
        ];
    }
    success($settings);
}

function adminUpdateSettings(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();

    if (empty($input) || !is_array($input)) {
        error('No hay datos para actualizar', 400);
    }

    $db = getDB();
    $stmt = $db->prepare("UPDATE platform_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?");
    $updated = 0;

    foreach ($input as $key => $value) {
        $stmt->execute([(string)$value, $auth['sub'], $key]);
        if ($stmt->rowCount() > 0) {
            $updated++;
        }
    }

    success(['updated' => $updated], 'Configuración actualizada');
}
