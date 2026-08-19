-- Seed default recipes so the Meal Planner is usable out of the box
INSERT INTO recipes (name, meal_type, calories, protein_g, carbs_g, fat_g, ingredients, instructions, prep_time_minutes, difficulty)
SELECT * FROM (
    SELECT 'Protein Oatmeal' name, 'breakfast' meal_type, 420 calories, 35.0 protein_g, 50.0 carbs_g, 10.0 fat_g, '["1 cup oats","1 scoop whey protein","1/2 cup berries","1 tbsp honey"]' ingredients, 'Cook oats, mix in protein, top with berries and honey' instructions, 10 prep_time_minutes, 'easy' difficulty
    UNION ALL SELECT 'Chicken Salad', 'lunch', 480, 45.0, 15.0, 22.0, '["200g chicken breast","2 cups mixed greens","1/2 avocado","1 tbsp olive oil"]', 'Grill chicken, slice, toss with greens and avocado', 15, 'easy'
    UNION ALL SELECT 'Salmon with Quinoa', 'dinner', 520, 40.0, 45.0, 18.0, '["150g salmon","1 cup quinoa","1 cup broccoli","lemon juice"]', 'Cook quinoa, grill salmon, steam broccoli', 25, 'medium'
    UNION ALL SELECT 'Greek Yogurt Bowl', 'breakfast', 320, 25.0, 40.0, 8.0, '["1 cup greek yogurt","1/4 cup granola","1/2 banana","1 tbsp chia seeds"]', 'Layer yogurt, granola, banana, top with chia', 5, 'easy'
    UNION ALL SELECT 'Turkey Wrap', 'lunch', 380, 30.0, 35.0, 12.0, '["1 whole wheat tortilla","100g turkey breast","lettuce","tomato","mustard"]', 'Layer ingredients on tortilla, roll tightly', 10, 'easy'
    UNION ALL SELECT 'Protein Smoothie', 'snack', 280, 30.0, 30.0, 5.0, '["1 scoop whey","1 banana","1 cup almond milk","1 tbsp peanut butter"]', 'Blend all ingredients until smooth', 5, 'easy'
    UNION ALL SELECT 'Beef Stir Fry', 'dinner', 490, 42.0, 40.0, 16.0, '["150g lean beef","2 cups mixed vegetables","1 cup brown rice","soy sauce"]', 'Stir fry beef, add vegetables, serve over rice', 20, 'medium'
    UNION ALL SELECT 'Overnight Oats', 'breakfast', 350, 20.0, 55.0, 8.0, '["1/2 cup oats","1 cup milk","1 tbsp chia seeds","1 tbsp maple syrup"]', 'Mix all ingredients, refrigerate overnight', 5, 'easy'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE recipes.name = seed.name);
