<?php

function listClientMealPlans(string $clientId): void {
    $auth = requireRole('coach');
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM meal_plans WHERE client_id = ? ORDER BY created_at DESC");
    $stmt->execute([(int)$clientId]);
    success($stmt->fetchAll());
}

function createMealPlan(string $clientId): void {
    $auth = requireRole('coach');
    $input = getJsonInput();
    $rules = ['name' => 'required|string|min:1', 'startDate' => 'required|string'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    // Deactivate existing plans
    $db->prepare("UPDATE meal_plans SET is_active = 0 WHERE client_id = ?")->execute([(int)$clientId]);
    $db->prepare("INSERT INTO meal_plans (coach_id, client_id, name, daily_calories, protein_g, carbs_g, fat_g, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        ->execute([
            $auth['sub'], (int)$clientId, $input['name'],
            isset($input['dailyCalories']) ? (int)$input['dailyCalories'] : null,
            isset($input['proteinG']) ? (int)$input['proteinG'] : null,
            isset($input['carbsG']) ? (int)$input['carbsG'] : null,
            isset($input['fatG']) ? (int)$input['fatG'] : null,
            $input['startDate'], $input['endDate'] ?? null,
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Plan creado', 201);
}

function getCurrentMealPlan(): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM meal_plans WHERE client_id = ? AND is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE()) ORDER BY start_date DESC LIMIT 1");
    $stmt->execute([$auth['sub']]);
    $plan = $stmt->fetch();
    if (!$plan) { success(null); return; }
    // Get meal days
    $days = $db->prepare("SELECT mpd.*, r.name as recipe_name FROM meal_plan_days mpd LEFT JOIN recipes r ON r.id = mpd.recipe_id WHERE mpd.meal_plan_id = ? ORDER BY mpd.day_of_week, mpd.meal_number");
    $days->execute([$plan['id']]);
    $plan['days'] = $days->fetchAll();
    success($plan);
}

function generateGroceryList(string $planId): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT r.ingredients, r.name FROM meal_plan_days mpd JOIN recipes r ON r.id = mpd.recipe_id WHERE mpd.meal_plan_id = ?");
    $stmt->execute([(int)$planId]);
    $allIngredients = [];
    foreach ($stmt->fetchAll() as $row) {
        $ingredients = json_decode($row['ingredients'] ?? '[]', true);
        $allIngredients = array_merge($allIngredients, $ingredients);
    }
    success(['ingredients' => array_unique($allIngredients), 'total' => count($allIngredients)]);
}
