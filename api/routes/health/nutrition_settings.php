<?php

function getNutritionSettings(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_nutrition_settings WHERE user_id = ?");
    $stmt->execute([$userId]);
    $settings = $stmt->fetch();

    if (!$settings) {
        $settings = [
            'calories_target' => 1940,
            'protein_target' => 150,
            'carbs_target' => 220,
            'fat_target' => 65,
        ];
    }

    success([
        'caloriesTarget' => (int)$settings['calories_target'],
        'proteinTarget' => (float)$settings['protein_target'],
        'carbsTarget' => (float)$settings['carbs_target'],
        'fatTarget' => (float)$settings['fat_target'],
    ]);
}

function saveNutritionSettings(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();

    $rules = [
        'caloriesTarget' => 'numeric|min_value:0|max_value:99999',
        'proteinTarget' => 'numeric|min_value:0|max_value:9999',
        'carbsTarget' => 'numeric|min_value:0|max_value:9999',
        'fatTarget' => 'numeric|min_value:0|max_value:9999',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $chk = $db->prepare("SELECT id FROM user_nutrition_settings WHERE user_id = ?");
    $chk->execute([$userId]);

    if ($chk->fetch()) {
        $db->prepare("UPDATE user_nutrition_settings SET calories_target = ?, protein_target = ?, carbs_target = ?, fat_target = ? WHERE user_id = ?")
            ->execute([
                $input['caloriesTarget'] ?? 1940,
                $input['proteinTarget'] ?? 150,
                $input['carbsTarget'] ?? 220,
                $input['fatTarget'] ?? 65,
                $userId,
            ]);
    } else {
        $db->prepare("INSERT INTO user_nutrition_settings (user_id, calories_target, protein_target, carbs_target, fat_target) VALUES (?, ?, ?, ?, ?)")
            ->execute([
                $userId,
                $input['caloriesTarget'] ?? 1940,
                $input['proteinTarget'] ?? 150,
                $input['carbsTarget'] ?? 220,
                $input['fatTarget'] ?? 65,
            ]);
    }

    success(null, 'Nutrition targets saved');
}

function getClientNutritionSettings(string $clientId): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['coach', 'admin'], true)) {
        error('Unauthorized', 403);
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM user_nutrition_settings WHERE user_id = ?");
    $stmt->execute([$clientId]);
    $settings = $stmt->fetch();

    if (!$settings) {
        $settings = [
            'calories_target' => 1940,
            'protein_target' => 150,
            'carbs_target' => 220,
            'fat_target' => 65,
        ];
    }

    success([
        'caloriesTarget' => (int)$settings['calories_target'],
        'proteinTarget' => (float)$settings['protein_target'],
        'carbsTarget' => (float)$settings['carbs_target'],
        'fatTarget' => (float)$settings['fat_target'],
    ]);
}

function saveClientNutritionSettings(string $clientId): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['coach', 'admin'], true)) {
        error('Unauthorized', 403);
    }

    $input = getJsonInput();

    $rules = [
        'caloriesTarget' => 'numeric|min_value:0|max_value:99999',
        'proteinTarget' => 'numeric|min_value:0|max_value:9999',
        'carbsTarget' => 'numeric|min_value:0|max_value:9999',
        'fatTarget' => 'numeric|min_value:0|max_value:9999',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $chk = $db->prepare("SELECT id FROM user_nutrition_settings WHERE user_id = ?");
    $chk->execute([$clientId]);

    if ($chk->fetch()) {
        $db->prepare("UPDATE user_nutrition_settings SET calories_target = ?, protein_target = ?, carbs_target = ?, fat_target = ? WHERE user_id = ?")
            ->execute([
                $input['caloriesTarget'] ?? 1940,
                $input['proteinTarget'] ?? 150,
                $input['carbsTarget'] ?? 220,
                $input['fatTarget'] ?? 65,
                $clientId,
            ]);
    } else {
        $db->prepare("INSERT INTO user_nutrition_settings (user_id, calories_target, protein_target, carbs_target, fat_target) VALUES (?, ?, ?, ?, ?)")
            ->execute([
                $clientId,
                $input['caloriesTarget'] ?? 1940,
                $input['proteinTarget'] ?? 150,
                $input['carbsTarget'] ?? 220,
                $input['fatTarget'] ?? 65,
            ]);
    }

    success(null, 'Client nutrition targets saved');
}
