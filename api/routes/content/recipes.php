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
            'description' => $r['description'],
            'mealType' => $r['meal_type'],
            'calories' => (int)$r['calories'],
            'protein' => (float)$r['protein'],
            'carbs' => (float)$r['carbs'],
            'fat' => (float)$r['fat'],
            'ingredients' => json_decode($r['ingredients'] ?? '[]', true),
            'instructions' => $r['instructions'],
            'imageUrl' => $r['image_url'],
            'prepTime' => (int)$r['prep_time'],
            'difficulty' => $r['difficulty'],
        ];
    }, $stmt->fetchAll());
    success($result);
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
    $stmt = $db->prepare("INSERT INTO recipes (name, description, meal_type, calories, protein, carbs, fat, ingredients, instructions, prep_time, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $count = 0;
    foreach ($recipes as $r) {
        $chk = $db->prepare("SELECT id FROM recipes WHERE name = ?");
        $chk->execute([$r[0]]);
        if (!$chk->fetch()) {
            $stmt->execute($r);
            $count++;
        }
    }
    success(['created' => $count], "$count recetas insertadas");
}
