INSERT IGNORE INTO exercise_library (name, description, category, muscle_group, equipment, difficulty, instructions) VALUES
('Bench Press','Barbell bench press for chest','chest','pectorals','barbell','intermediate','Lie on bench, lower bar to chest, press up'),
('Push Up','Bodyweight chest exercise','chest','pectorals','bodyweight','beginner','Keep body straight, lower chest to ground'),
('Incline Dumbbell Press','Dumbbell press on incline bench','chest','upper chest','dumbbell','intermediate','Press dumbbells up from chest level'),
('Deadlift','Full body compound lift','back','full back','barbell','advanced','Hip hinge, pull bar up along legs'),
('Pull Up','Bodyweight back exercise','back','lats','bodyweight','intermediate','Pull chin over bar with controlled motion'),
('Barbell Row','Bent over row for back','back','mid back','barbell','intermediate','Row bar to lower chest with straight back'),
('Squat','Barbell squat for legs','legs','quadriceps','barbell','intermediate','Lower hips below parallel, keep chest up'),
('Leg Press','Machine leg press','legs','quadriceps','machine','beginner','Push platform away with legs'),
('Romanian Deadlift','Hamstring focused deadlift','legs','hamstrings','dumbbell','intermediate','Hinge at hips, keep legs slightly bent'),
('Overhead Press','Barbell shoulder press','shoulders','deltoids','barbell','intermediate','Press bar overhead from shoulders'),
('Lateral Raise','Dumbbell lateral raise','shoulders','side delts','dumbbell','beginner','Raise dumbbells to sides to shoulder height'),
('Face Pull','Cable face pull for rear delts','shoulders','rear delts','cable','beginner','Pull cable rope toward face'),
('Bicep Curl','Dumbbell bicep curl','arms','biceps','dumbbell','beginner','Curl dumbbells toward shoulders'),
('Tricep Pushdown','Cable tricep pushdown','arms','triceps','cable','beginner','Push cable down extending arms fully'),
('Plank','Core stability exercise','core','abs','bodyweight','beginner','Hold straight body position on forearms'),
('Russian Twist','Oblique rotation exercise','core','obliques','bodyweight','beginner','Rotate torso side to side with feet raised'),
('Running','Cardio running','cardio','full body','none','beginner','Run at steady or interval pace'),
('Jump Rope','Jump rope cardio','cardio','full body','jump rope','beginner','Jump rope at moderate pace');

INSERT IGNORE INTO recipes (name, description, meal_type, calories, protein, carbs, fat, ingredients, instructions, prep_time, difficulty) VALUES
('Protein Oatmeal','Oatmeal with whey protein and berries','breakfast',420,35,50,10,'["1 cup oats","1 scoop whey","1/2 cup berries","1 tbsp honey"]','Cook oats, mix protein, top with berries',10,'easy'),
('Chicken Salad','Grilled chicken breast with mixed greens','lunch',480,45,15,22,'["200g chicken","2 cups greens","1/2 avocado","1 tbsp olive oil"]','Grill chicken, slice, toss with greens',15,'easy'),
('Salmon with Quinoa','Grilled salmon with quinoa and vegetables','dinner',520,40,45,18,'["150g salmon","1 cup quinoa","1 cup broccoli","lemon juice"]','Cook quinoa, grill salmon, steam broccoli',25,'medium'),
('Greek Yogurt Bowl','Greek yogurt with granola and fruits','breakfast',320,25,40,8,'["1 cup greek yogurt","1/4 cup granola","1/2 banana","1 tbsp chia"]','Layer yogurt, granola, banana, chia',5,'easy'),
('Turkey Wrap','Whole wheat wrap with turkey and vegetables','lunch',380,30,35,12,'["1 tortilla","100g turkey","lettuce","tomato","mustard"]','Layer on tortilla, roll tight',10,'easy'),
('Protein Smoothie','Post-workout protein smoothie','snack',280,30,30,5,'["1 scoop whey","1 banana","1 cup almond milk","1 tbsp pb"]','Blend all until smooth',5,'easy'),
('Beef Stir Fry','Lean beef with vegetables and rice','dinner',490,42,40,16,'["150g beef","2 cups veggies","1 cup rice","soy sauce"]','Stir fry beef, add veggies, serve over rice',20,'medium'),
('Overnight Oats','Make-ahead oatmeal with chia','breakfast',350,20,55,8,'["1/2 cup oats","1 cup milk","1 tbsp chia","1 tbsp syrup"]','Mix all, refrigerate overnight',5,'easy');
