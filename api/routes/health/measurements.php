<?php

function getMeasurements(): void {
    $auth = requireAuth();
    $db = getDB();
    $days = min(365, max(1, (int)($_GET['days'] ?? 30)));
    $date = $_GET['date'] ?? '';
    if ($date) {
        $stmt = $db->prepare("SELECT * FROM body_measurements WHERE user_id = ? AND date = ?");
        $stmt->execute([$auth['sub'], $date]);
    } else {
        $stmt = $db->prepare("SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date DESC LIMIT ?");
        $stmt->execute([$auth['sub'], $days]);
    }
    success(array_map(function($m) {
        return [
            'id' => (int)$m['id'],
            'date' => $m['date'],
            'weightKg' => $m['weight_kg'] ? (float)$m['weight_kg'] : null,
            'bodyFatPct' => $m['body_fat_pct'] ? (float)$m['body_fat_pct'] : null,
            'waistCm' => $m['waist_cm'] ? (float)$m['waist_cm'] : null,
            'hipCm' => $m['hip_cm'] ? (float)$m['hip_cm'] : null,
            'chestCm' => $m['chest_cm'] ? (float)$m['chest_cm'] : null,
            'leftArmCm' => $m['left_arm_cm'] ? (float)$m['left_arm_cm'] : null,
            'rightArmCm' => $m['right_arm_cm'] ? (float)$m['right_arm_cm'] : null,
            'leftThighCm' => $m['left_thigh_cm'] ? (float)$m['left_thigh_cm'] : null,
            'rightThighCm' => $m['right_thigh_cm'] ? (float)$m['right_thigh_cm'] : null,
            'notes' => $m['notes'],
        ];
    }, $stmt->fetchAll()));
}

function saveMeasurements(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $date = $input['date'] ?? date('Y-m-d');
    $db = getDB();
    $fields = ['weight_kg', 'body_fat_pct', 'waist_cm', 'hip_cm', 'chest_cm',
        'left_arm_cm', 'right_arm_cm', 'left_thigh_cm', 'right_thigh_cm', 'left_calf_cm', 'right_calf_cm'];
    $sets = [];
    $params = [];
    $fieldMap = [
        'weightKg' => 'weight_kg', 'bodyFatPct' => 'body_fat_pct', 'waistCm' => 'waist_cm',
        'hipCm' => 'hip_cm', 'chestCm' => 'chest_cm', 'leftArmCm' => 'left_arm_cm',
        'rightArmCm' => 'right_arm_cm', 'leftThighCm' => 'left_thigh_cm', 'rightThighCm' => 'right_thigh_cm',
        'leftCalfCm' => 'left_calf_cm', 'rightCalfCm' => 'right_calf_cm',
    ];
    $ranges = [
        'weightKg' => [20, 300], 'bodyFatPct' => [1, 60],
        'waistCm' => [10, 200], 'hipCm' => [10, 200], 'chestCm' => [10, 200],
        'leftArmCm' => [10, 80], 'rightArmCm' => [10, 80],
        'leftThighCm' => [10, 120], 'rightThighCm' => [10, 120],
        'leftCalfCm' => [10, 80], 'rightCalfCm' => [10, 80],
    ];
    foreach ($fieldMap as $inputKey => $dbCol) {
        if (isset($input[$inputKey])) {
            $val = (float)$input[$inputKey];
            if (isset($ranges[$inputKey]) && ($val < $ranges[$inputKey][0] || $val > $ranges[$inputKey][1])) {
                error("Invalid value for $inputKey: must be between {$ranges[$inputKey][0]} and {$ranges[$inputKey][1]}", 422);
            }
            $sets[] = "$dbCol = ?";
            $params[] = $val;
        }
    }
    if (empty($sets)) error('No hay campos para guardar', 400);
    $db->prepare("INSERT INTO body_measurements (user_id, date, " . implode(', ', array_map(fn($s) => explode(' = ', $s)[0], $sets)) . ") 
        VALUES (?, ?, " . implode(', ', array_fill(0, count($sets), '?')) . ")
        ON DUPLICATE KEY UPDATE " . implode(', ', $sets))
        ->execute(array_merge([$auth['sub'], $date], $params));
    success(null, 'Medidas guardadas');
}
