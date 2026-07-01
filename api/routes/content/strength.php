<?php

function calculateOneRm(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['weight' => 'required|numeric|min_value:1', 'reps' => 'required|numeric|min_value:1|max_value:30'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $weight = (float)$input['weight'];
    $reps = (int)$input['reps'];
    $formula = $input['formula'] ?? 'epley';
    
    // Epley: 1RM = weight * (1 + reps/30)
    // Brzycki: 1RM = weight * (36 / (37 - reps))
    if ($formula === 'brzycki' && $reps < 36) {
        $estimated = $weight * (36 / (37 - $reps));
    } else {
        $estimated = $weight * (1 + $reps / 30);
    }
    
    // Save if exercise_id provided
    if (!empty($input['exerciseId'])) {
        $db = getDB();
        $db->prepare("INSERT INTO estimated_one_rms (user_id, exercise_id, estimated_1rm, formula_used) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE estimated_1rm = VALUES(estimated_1rm), formula_used = VALUES(formula_used), calculated_at = NOW()")
            ->execute([$auth['sub'], (int)$input['exerciseId'], round($estimated, 2), $formula]);
    }
    
    success(['estimated1RM' => round($estimated, 2), 'formula' => $formula, 'reps' => $reps, 'weight' => $weight]);
}

function getWorkoutVolume(): void {
    $auth = requireAuth();
    $db = getDB();
    $start = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
    $end = $_GET['end'] ?? date('Y-m-d');
    $stmt = $db->prepare("
        SELECT DATE(wl.created_at) as date, SUM(wl.total_volume) as volume
        FROM workout_logs wl
        WHERE wl.user_id = ? AND DATE(wl.created_at) BETWEEN ? AND ?
        GROUP BY DATE(wl.created_at)
        ORDER BY date ASC
    ");
    $stmt->execute([$auth['sub'], $start, $end]);
    success($stmt->fetchAll());
}

function getStrengthStandards(): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->query("SELECT ss.*, el.name as exercise_name FROM strength_standards ss JOIN exercise_library el ON el.id = ss.exercise_id ORDER BY el.name");
    success($stmt->fetchAll());
}

function suggestProgression(string $exerciseId): void {
    $auth = requireAuth();
    $db = getDB();
    // Get last 5 logs for this exercise
    $stmt = $db->prepare("
        SELECT wl.weight_used, wl.reps, wl.rpe, wl.created_at
        FROM workout_logs wl
        WHERE wl.user_id = ? AND wl.exercise_id = ?
        ORDER BY wl.created_at DESC LIMIT 5
    ");
    $stmt->execute([$auth['sub'], (int)$exerciseId]);
    $logs = $stmt->fetchAll();
    if (empty($logs)) {
        success(['suggestion' => 'Start with a light weight to warm up', 'weight' => null]);
        return;
    }
    $avgRpe = array_sum(array_column($logs, 'rpe')) / count($logs);
    $lastWeight = (float)($logs[0]['weight_used'] ?? 0);
    $lastReps = (int)($logs[0]['reps'] ?? 0);
    // If RPE < 7, increase weight 5%
    if ($avgRpe < 7 && $lastWeight > 0) {
        $suggested = round($lastWeight * 1.05, 1);
        success(['suggestion' => 'Increase weight by 5%', 'weight' => $suggested, 'reps' => $lastReps, 'avgRpe' => round($avgRpe, 1)]);
    } elseif ($avgRpe >= 9) {
        $suggested = round($lastWeight * 0.95, 1);
        success(['suggestion' => 'Decrease weight by 5% or take a deload week', 'weight' => $suggested, 'reps' => $lastReps, 'avgRpe' => round($avgRpe, 1)]);
    } else {
        success(['suggestion' => 'Maintain current weight', 'weight' => $lastWeight, 'reps' => $lastReps, 'avgRpe' => round($avgRpe, 1)]);
    }
}
