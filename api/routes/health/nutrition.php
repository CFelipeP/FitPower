<?php

function getNutrition(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $date = parseDate($_GET['date'] ?? date('Y-m-d'));

    $stmt = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? AND log_date = ?");
    $stmt->execute([$userId, $date]);
    $data = $stmt->fetch();

    if (!$data) {
        $settingsStmt = $db->prepare("SELECT * FROM user_nutrition_settings WHERE user_id = ?");
        $settingsStmt->execute([$userId]);
        $settings = $settingsStmt->fetch();

        $data = [
            'log_date' => $date,
            'calories_target' => $settings ? (int)$settings['calories_target'] : 1940,
            'calories_consumed' => 0,
            'protein_current' => 0,
            'protein_target' => $settings ? (float)$settings['protein_target'] : 150,
            'carbs_current' => 0,
            'carbs_target' => $settings ? (float)$settings['carbs_target'] : 220,
            'fat_current' => 0,
            'fat_target' => $settings ? (float)$settings['fat_target'] : 65,
            'water_glasses' => 0,
            'breakfast_checked' => 0,
            'lunch_checked' => 0,
            'dinner_checked' => 0,
            'snack_checked' => 0,
        ];
    }

    success([
        'date' => $data['log_date'],
        'target' => (int)$data['calories_target'],
        'consumed' => (int)$data['calories_consumed'],
        'protein' => ['current' => (float)$data['protein_current'], 'target' => (float)$data['protein_target']],
        'carbs' => ['current' => (float)$data['carbs_current'], 'target' => (float)$data['carbs_target']],
        'fat' => ['current' => (float)$data['fat_current'], 'target' => (float)$data['fat_target']],
        'waterGlasses' => (int)$data['water_glasses'],
        'mealChecked' => [
            (int)$data['breakfast_checked'],
            (int)$data['lunch_checked'],
            (int)$data['dinner_checked'],
            (int)$data['snack_checked'],
        ],
    ]);
}

function parseDate(string $d): string {
    return $d === 'today' ? date('Y-m-d') : $d;
}

function saveNutrition(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();

    $rules = [
        'caloriesConsumed' => 'numeric|min_value:0|max_value:99999',
        'caloriesTarget' => 'numeric|min_value:0|max_value:99999',
        'proteinCurrent' => 'numeric|min_value:0|max_value:9999',
        'proteinTarget' => 'numeric|min_value:0|max_value:9999',
        'carbsCurrent' => 'numeric|min_value:0|max_value:9999',
        'carbsTarget' => 'numeric|min_value:0|max_value:9999',
        'fatCurrent' => 'numeric|min_value:0|max_value:9999',
        'fatTarget' => 'numeric|min_value:0|max_value:9999',
        'waterGlasses' => 'numeric|min_value:0|max_value:99',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $date = parseDate($input['date'] ?? date('Y-m-d'));

    $stmt = $db->prepare("SELECT id FROM nutrition_logs WHERE user_id = ? AND log_date = ?");
    $stmt->execute([$userId, $date]);
    $existing = $stmt->fetch();

    $settingsStmt = $db->prepare("SELECT * FROM user_nutrition_settings WHERE user_id = ?");
    $settingsStmt->execute([$userId]);
    $settings = $settingsStmt->fetch();

    $defaultCaloriesTarget = $settings ? (int)$settings['calories_target'] : 1940;
    $defaultProteinTarget = $settings ? (float)$settings['protein_target'] : 150;
    $defaultCarbsTarget = $settings ? (float)$settings['carbs_target'] : 220;
    $defaultFatTarget = $settings ? (float)$settings['fat_target'] : 65;

    $fields = [
        'calories_consumed' => $input['caloriesConsumed'] ?? 0,
        'calories_target' => $input['caloriesTarget'] ?? $defaultCaloriesTarget,
        'protein_current' => $input['proteinCurrent'] ?? 0,
        'protein_target' => $input['proteinTarget'] ?? $defaultProteinTarget,
        'carbs_current' => $input['carbsCurrent'] ?? 0,
        'carbs_target' => $input['carbsTarget'] ?? $defaultCarbsTarget,
        'fat_current' => $input['fatCurrent'] ?? 0,
        'fat_target' => $input['fatTarget'] ?? $defaultFatTarget,
        'water_glasses' => $input['waterGlasses'] ?? 0,
        'breakfast_checked' => filter_var($input['breakfastChecked'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        'lunch_checked' => filter_var($input['lunchChecked'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        'dinner_checked' => filter_var($input['dinnerChecked'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        'snack_checked' => filter_var($input['snackChecked'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
    ];

    if ($existing) {
        $sets = [];
        $params = [];
        foreach ($fields as $col => $val) {
            $sets[] = "$col = ?";
            $params[] = $val;
        }
        $params[] = $existing['id'];
        $db->prepare("UPDATE nutrition_logs SET " . implode(', ', $sets) . " WHERE id = ?")
            ->execute($params);
    } else {
        $cols = array_keys($fields);
        $placeholders = array_fill(0, count($fields), '?');
        $params = array_values($fields);
        array_unshift($params, $userId, $date);
        $db->prepare("INSERT INTO nutrition_logs (user_id, log_date, " . implode(', ', $cols) . ") VALUES (?, ?, " . implode(', ', $placeholders) . ")")
            ->execute($params);
    }

    success(null, 'Nutrición guardada');
}

function getMetrics(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY log_date DESC LIMIT 10");
    $stmt->execute([$userId]);
    $metrics = $stmt->fetchAll();

    $result = array_map(function($m) {
        return [
            'date' => $m['log_date'],
            'weight' => $m['weight_kg'] ? (float)$m['weight_kg'] : null,
            'bodyFat' => $m['body_fat_pct'] ? (float)$m['body_fat_pct'] : null,
            'muscle' => $m['muscle_kg'] ? (float)$m['muscle_kg'] : null,
            'bmi' => $m['bmi'] ? (float)$m['bmi'] : null,
        ];
    }, $metrics);

    success($result);
}

function getNutritionHistory(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $db = getDB();

    $days = min(90, max(7, (int)($_GET['days'] ?? 30)));

    $stmt = $db->prepare("
        SELECT log_date, calories_target, calories_consumed,
               protein_current, protein_target,
               carbs_current, carbs_target,
               fat_current, fat_target
        FROM nutrition_logs
        WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY log_date ASC
    ");
    $stmt->execute([$userId, $days]);
    $rows = $stmt->fetchAll();

    $result = array_map(function($r) {
        return [
            'date' => $r['log_date'],
            'caloriesTarget' => (int)$r['calories_target'],
            'caloriesConsumed' => (int)$r['calories_consumed'],
            'protein' => ['current' => (float)$r['protein_current'], 'target' => (float)$r['protein_target']],
            'carbs' => ['current' => (float)$r['carbs_current'], 'target' => (float)$r['carbs_target']],
            'fat' => ['current' => (float)$r['fat_current'], 'target' => (float)$r['fat_target']],
        ];
    }, $rows);

    success($result);
}

function getNutritionHistoryCoach(string $clientId): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['coach', 'admin'], true)) {
        error('Unauthorized', 403);
    }

    $db = getDB();
    $days = min(90, max(7, (int)($_GET['days'] ?? 30)));

    $stmt = $db->prepare("
        SELECT log_date, calories_target, calories_consumed,
               protein_current, protein_target,
               carbs_current, carbs_target,
               fat_current, fat_target
        FROM nutrition_logs
        WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY log_date ASC
    ");
    $stmt->execute([$clientId, $days]);
    $rows = $stmt->fetchAll();

    $result = array_map(function($r) {
        return [
            'date' => $r['log_date'],
            'caloriesTarget' => (int)$r['calories_target'],
            'caloriesConsumed' => (int)$r['calories_consumed'],
            'protein' => ['current' => (float)$r['protein_current'], 'target' => (float)$r['protein_target']],
            'carbs' => ['current' => (float)$r['carbs_current'], 'target' => (float)$r['carbs_target']],
            'fat' => ['current' => (float)$r['fat_current'], 'target' => (float)$r['fat_target']],
        ];
    }, $rows);

    success($result);
}

function saveMetrics(): void {
    $auth = requireAuth();
    $userId = $auth['sub'];
    $input = getJsonInput();

    $rules = [
        'weight' => 'numeric|min_value:20|max_value:500',
        'bodyFat' => 'numeric|min_value:1|max_value:70',
        'muscle' => 'numeric|min_value:10|max_value:300',
        'bmi' => 'numeric|min_value:10|max_value:60',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $date = parseDate($input['date'] ?? date('Y-m-d'));

    $db->prepare("
        INSERT INTO body_metrics (user_id, log_date, weight_kg, body_fat_pct, muscle_kg, bmi)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg), body_fat_pct = VALUES(body_fat_pct),
            muscle_kg = VALUES(muscle_kg), bmi = VALUES(bmi)
    ")->execute([
        $userId,
        $date,
        $input['weight'] ?? null,
        $input['bodyFat'] ?? null,
        $input['muscle'] ?? null,
        $input['bmi'] ?? null,
    ]);

    success(null, 'Métricas guardadas');
}
