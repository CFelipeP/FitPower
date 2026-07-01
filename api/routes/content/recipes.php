<?php

function listRecipes(): void {
    $auth = requireAuth();
    $db = getDB();
    $mealType = $_GET['mealType'] ?? '';
    $search = $_GET['search'] ?? '';
    $where = [];
    $params = [];
    if ($mealType && $mealType !== 'all') { $where[] = "(meal_type = ? OR meal_type = 'all')"; $params[] = $mealType; }
    if ($search) { $where[] = "name LIKE ?"; $params[] = "%$search%"; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM recipes $whereClause ORDER BY name LIMIT 50");
    $stmt->execute($params);
    $result = array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'name' => $r['name'],
            'description' => null,
            'mealType' => $r['meal_type'],
            'calories' => (int)$r['calories'],
            'protein' => (float)$r['protein_g'],
            'carbs' => (float)$r['carbs_g'],
            'fat' => (float)$r['fat_g'],
            'ingredients' => json_decode($r['ingredients'] ?? '[]', true),
            'instructions' => $r['instructions'],
            'imageUrl' => $r['image_url'],
            'prepTime' => (int)$r['prep_time_minutes'],
            'difficulty' => $r['difficulty'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function createRecipe(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['name' => 'required|string|min:1|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO recipes (name, meal_type, description, calories, protein_g, carbs_g, fat_g, ingredients, instructions, image_url, prep_time_minutes, difficulty, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['name'],
        $input['mealType'] ?? null,
        $input['description'] ?? null,
        isset($input['calories']) ? (int)$input['calories'] : null,
        isset($input['protein']) ? (float)$input['protein'] : null,
        isset($input['carbs']) ? (float)$input['carbs'] : null,
        isset($input['fat']) ? (float)$input['fat'] : null,
        isset($input['ingredients']) ? json_encode($input['ingredients']) : null,
        $input['instructions'] ?? null,
        $input['imageUrl'] ?? null,
        isset($input['prepTime']) ? (int)$input['prepTime'] : null,
        $input['difficulty'] ?? null,
        isset($input['tags']) ? json_encode($input['tags']) : null,
    ]);
    success(['id' => (int)$db->lastInsertId()], 'Receta creada', 201);
}

function seedRecipes(): void {
    $auth = requireAuth();
    $db = getDB();
    $recipes = [
        ['Protein Oatmeal', 'Oatmeal with whey protein and berries', 'breakfast', 420, 35, 50, 10, '["1 cup oats","1 scoop whey protein","1/2 cup berries","1 tbsp honey"]', 'Cook oats, mix in protein, top with berries and honey', 10, 'easy'],
        ['Chicken Salad', 'Grilled chicken breast with mixed greens', 'lunch', 480, 45, 15, 22, '["200g chicken breast","2 cups mixed greens","1/2 avocado","1 tbsp olive oil"]', 'Grill chicken, slice, toss with greens and avocado', 15, 'easy'],
        ['Salmon with Quinoa', 'Grilled salmon with quinoa and vegetables', 'dinner', 520, 40, 45, 18, '["150g salmon","1 cup quinoa","1 cup broccoli","lemon juice"]', 'Cook quinoa, grill salmon, steam broccoli', 25, 'medium'],
        ['Greek Yogurt Bowl', 'Greek yogurt with granola and fruits', 'breakfast', 320, 25, 40, 8, '["1 cup greek yogurt","1/4 cup granola","1/2 banana","1 tbsp chia seeds"]', 'Layer yogurt, granola, banana, top with chia', 5, 'easy'],
        ['Turkey Wrap', 'Whole wheat wrap with turkey and vegetables', 'lunch', 380, 30, 35, 12, '["1 whole wheat tortilla","100g turkey breast","lettuce","tomato","mustard"]', 'Layer ingredients on tortilla, roll tightly', 10, 'easy'],
        ['Protein Smoothie', 'Post-workout protein smoothie', 'snack', 280, 30, 30, 5, '["1 scoop whey","1 banana","1 cup almond milk","1 tbsp peanut butter"]', 'Blend all ingredients until smooth', 5, 'easy'],
        ['Beef Stir Fry', 'Lean beef with vegetables and rice', 'dinner', 490, 42, 40, 16, '["150g lean beef","2 cups mixed vegetables","1 cup brown rice","soy sauce"]', 'Stir fry beef, add vegetables, serve over rice', 20, 'medium'],
        ['Overnight Oats', 'Make-ahead oatmeal with chia', 'breakfast', 350, 20, 55, 8, '["1/2 cup oats","1 cup milk","1 tbsp chia seeds","1 tbsp maple syrup"]', 'Mix all ingredients, refrigerate overnight', 5, 'easy'],
    ];
    $stmt = $db->prepare("INSERT INTO recipes (name, meal_type, calories, protein_g, carbs_g, fat_g, ingredients, instructions, prep_time_minutes, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $count = 0;
    foreach ($recipes as $r) {
        $chk = $db->prepare("SELECT id FROM recipes WHERE name = ?");
        $chk->execute([$r[0]]);
        if (!$chk->fetch()) {
            $stmt->execute([$r[0], $r[2], $r[3], $r[4], $r[5], $r[6], $r[7], $r[8], $r[9], $r[10]]);
            $count++;
        }
    }
    success(['created' => $count], "$count recetas insertadas");
}

function updateRecipe(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM recipes WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Receta no encontrada', 404);
    $fieldMap = [
        'name' => 'name',
        'mealType' => 'meal_type',
        'calories' => 'calories',
        'protein' => 'protein_g',
        'carbs' => 'carbs_g',
        'fat' => 'fat_g',
        'ingredients' => 'ingredients',
        'instructions' => 'instructions',
        'imageUrl' => 'image_url',
        'prepTime' => 'prep_time_minutes',
        'difficulty' => 'difficulty',
    ];
    $updates = [];
    $params = [];
    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $inputKey === 'ingredients' ? json_encode($input[$inputKey]) : $input[$inputKey];
        }
    }
    if (empty($updates)) error('No hay campos para actualizar', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE recipes SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    success(null, 'Receta actualizada');
}

function deleteRecipe(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM recipes WHERE id = ?");
    $stmt->execute([(int)$id]);
    if (!$stmt->fetch()) error('Receta no encontrada', 404);
    $db->prepare("DELETE FROM recipes WHERE id = ?")->execute([(int)$id]);
    success(null, 'Receta eliminada');
}
