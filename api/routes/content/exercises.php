<?php

require_once __DIR__ . '/../../helpers/program_access.php';

function listExercises(): void {
    $auth = requireAuth();
    $db = getDB();
    $role = $auth['role'] ?? 'client';
    $category = $_GET['category'] ?? '';
    $muscle = $_GET['muscle'] ?? '';
    $search = $_GET['search'] ?? '';
    $where = [];
    $params = [];

    // Users must NOT browse the global library: they only see the exercises
    // that belong to Programs they are actively enrolled in. Coaches/admins
    // get the full library.
    if (!managesExerciseLibrary($role)) {
        $ids = userAccessibleExerciseIds($db, (int)$auth['sub']);
        if (empty($ids)) {
            success([]);
            return;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $where[] = "id IN ($placeholders)";
        $params = array_merge($params, array_map('intval', $ids));
    }

    if ($category) { $where[] = "category = ?"; $params[] = $category; }
    if ($muscle) { $where[] = "muscle_group = ?"; $params[] = $muscle; }
    if ($search) { $where[] = "(name LIKE ? OR description LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM exercise_library $whereClause ORDER BY category, name");
    $stmt->execute($params);
    $exercises = $stmt->fetchAll();
    $linked = loadLinkedVideos($db, array_column($exercises, 'id'));
    $result = array_map(function($e) use ($linked) {
        return [
            'id' => (int)$e['id'],
            'name' => $e['name'],
            'description' => $e['description'],
            'category' => $e['category'],
            'muscleGroup' => $e['muscle_group'],
            'secondaryMuscles' => $e['secondary_muscles'] ? json_decode($e['secondary_muscles'], true) : null,
            'equipment' => $e['equipment'],
            'difficulty' => $e['difficulty'],
            'videoUrl' => $e['video_url'],
            'imageUrl' => $e['image_url'],
            'instructions' => $e['instructions'],
            'caloriesBurned' => $e['calories_burned'] ? (float)$e['calories_burned'] : null,
            'source' => $e['source'],
            'externalId' => $e['external_id'],
            'linkedVideos' => $linked[(int)$e['id']] ?? [],
        ];
    }, $exercises);
    success($result);
}

/** Library videos attached to exercises (used by coaches and shown to users). */
function loadLinkedVideos(PDO $db, array $exerciseIds): array {
    if (empty($exerciseIds)) return [];
    $placeholders = implode(',', array_fill(0, count($exerciseIds), '?'));
    $stmt = $db->prepare("
        SELECT id, title, file_path, category, exercise_id FROM video_library
        WHERE exercise_id IN ($placeholders) AND exercise_id IS NOT NULL
        ORDER BY created_at DESC
    ");
    $stmt->execute(array_map('intval', $exerciseIds));
    $out = [];
    foreach ($stmt->fetchAll() as $v) {
        $out[(int)$v['exercise_id']][] = [
            'id' => (int)$v['id'],
            'title' => $v['title'],
            'filePath' => $v['file_path'],
            'category' => $v['category'],
        ];
    }
    return $out;
}

/**
 * Single exercise with access control. A user may only read an exercise that
 * is part of a Program they are enrolled in; anything else is 403.
 */
function getExercise(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $role = $auth['role'] ?? 'client';

    $stmt = $db->prepare("SELECT * FROM exercise_library WHERE id = ?");
    $stmt->execute([(int)$id]);
    $e = $stmt->fetch();
    if (!$e) {
        error('Exercise not found', 404);
    }

    if (!managesExerciseLibrary($role)) {
        $ids = userAccessibleExerciseIds($db, (int)$auth['sub']);
        if (!in_array((int)$id, array_map('intval', $ids), true)) {
            error('You do not have permission to access this exercise', 403);
        }
    }

    success([
        'id' => (int)$e['id'],
        'name' => $e['name'],
        'description' => $e['description'],
        'category' => $e['category'],
        'muscleGroup' => $e['muscle_group'],
        'secondaryMuscles' => $e['secondary_muscles'] ? json_decode($e['secondary_muscles'], true) : null,
        'equipment' => $e['equipment'],
        'difficulty' => $e['difficulty'],
        'videoUrl' => $e['video_url'],
        'imageUrl' => $e['image_url'],
        'instructions' => $e['instructions'],
        'caloriesBurned' => $e['calories_burned'] ? (float)$e['calories_burned'] : null,
        'source' => $e['source'],
        'externalId' => $e['external_id'],
        'linkedVideos' => (loadLinkedVideos($db, [(int)$e['id']])[(int)$e['id']] ?? []),
    ]);
}

function createExercise(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only coaches and administrators can create exercises', 403);
    }
    $input = getJsonInput();

    $rules = [
        'name' => 'required|string|min:1|max:255',
        'category' => 'required|string|min:1|max:100',
        'description' => 'string|max:2000',
        'muscleGroup' => 'string|max:100',
        'equipment' => 'string|max:100',
        'difficulty' => 'in:beginner,intermediate,advanced',
        'instructions' => 'string|max:5000',
        'videoUrl' => 'string|max:500',
        'imageUrl' => 'string|max:500',
        'caloriesBurned' => 'numeric|min_value:0|max_value:999',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();
    $chk = $db->prepare("SELECT id FROM exercise_library WHERE name = ?");
    $chk->execute([$input['name']]);
    if ($chk->fetch()) {
        error('An exercise with that name already exists', 409);
    }

    $stmt = $db->prepare(
        "INSERT INTO exercise_library (name, description, category, muscle_group, equipment, difficulty, instructions, video_url, image_url, calories_burned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $input['name'],
        $input['description'] ?? '',
        $input['category'],
        $input['muscleGroup'] ?? '',
        $input['equipment'] ?? '',
        $input['difficulty'] ?? 'beginner',
        $input['instructions'] ?? '',
        $input['videoUrl'] ?? '',
        $input['imageUrl'] ?? '',
        $input['caloriesBurned'] ?? null,
    ]);
    $id = $db->lastInsertId();

    success([
        'id' => (int)$id,
        'name' => $input['name'],
    ], 'Exercise created successfully');
}

function updateExercise(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'], true)) {
        error('Only coaches and administrators can modify exercises', 403);
    }
    $input = getJsonInput();
    $db = getDB();

    $chk = $db->prepare("SELECT id FROM exercise_library WHERE id = ?");
    $chk->execute([$id]);
    if (!$chk->fetch()) {
        error('Exercise not found', 404);
    }

    $validationRules = [];
    if (isset($input['name'])) $validationRules['name'] = 'string|min:1|max:255';
    if (isset($input['category'])) $validationRules['category'] = 'string|min:1|max:100';
    if (isset($input['description'])) $validationRules['description'] = 'string|max:2000';
    if (isset($input['muscleGroup'])) $validationRules['muscleGroup'] = 'string|max:100';
    if (isset($input['equipment'])) $validationRules['equipment'] = 'string|max:100';
    if (isset($input['difficulty'])) $validationRules['difficulty'] = 'in:beginner,intermediate,advanced';
    if (isset($input['instructions'])) $validationRules['instructions'] = 'string|max:5000';
    if (isset($input['videoUrl'])) $validationRules['videoUrl'] = 'string|max:500';
    if (isset($input['imageUrl'])) $validationRules['imageUrl'] = 'string|max:500';
    if (isset($input['caloriesBurned'])) $validationRules['caloriesBurned'] = 'numeric|min_value:0|max_value:999';

    if ($validationRules) {
        $errors = validate($input, $validationRules);
        if ($errors) {
            error('Validation error', 422, $errors);
        }
    }

    $fields = [];
    $params = [];
    foreach (['name' => 'name', 'description' => 'description', 'category' => 'category',
              'muscleGroup' => 'muscle_group', 'equipment' => 'equipment',
              'difficulty' => 'difficulty', 'instructions' => 'instructions',
              'videoUrl' => 'video_url', 'imageUrl' => 'image_url',
              'caloriesBurned' => 'calories_burned'] as $inputKey => $dbCol) {
        if (isset($input[$inputKey])) {
            $fields[] = "$dbCol = ?";
            $params[] = $input[$inputKey];
        }
    }
    if (empty($fields)) {
        error('No fields to update', 422);
    }

    $params[] = $id;
    $db->prepare("UPDATE exercise_library SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    success(null, 'Exercise updated');
}

function deleteExercise(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'])) {
        error('Only coaches and administrators can delete exercises', 403);
    }
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM exercise_library WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        error('Exercise not found', 404);
    }
    success(null, 'Exercise deleted');
}

function seedExercises(): void {
    requireRole('admin');
    $db = getDB();
    $exercises = [
        ['Bench Press', 'Barbell bench press for chest', 'chest', 'pectorals', 'barbell', 'intermediate', 'Lie on bench, lower bar to chest, press up', 5.0],
        ['Push Up', 'Bodyweight chest exercise', 'chest', 'pectorals', 'bodyweight', 'beginner', 'Keep body straight, lower chest to ground', 3.5],
        ['Incline Dumbbell Press', 'Dumbbell press on incline bench', 'chest', 'upper chest', 'dumbbell', 'intermediate', 'Press dumbbells up from chest level', 4.5],
        ['Deadlift', 'Full body compound lift', 'back', 'full back', 'barbell', 'advanced', 'Hip hinge, pull bar up along legs', 6.0],
        ['Pull Up', 'Bodyweight back exercise', 'back', 'lats', 'bodyweight', 'intermediate', 'Pull chin over bar with controlled motion', 4.0],
        ['Barbell Row', 'Bent over row for back', 'back', 'mid back', 'barbell', 'intermediate', 'Row bar to lower chest with straight back', 5.0],
        ['Squat', 'Barbell squat for legs', 'legs', 'quadriceps', 'barbell', 'intermediate', 'Lower hips below parallel, keep chest up', 5.5],
        ['Leg Press', 'Machine leg press', 'legs', 'quadriceps', 'machine', 'beginner', 'Push platform away with legs', 3.5],
        ['Romanian Deadlift', 'Hamstring focused deadlift', 'legs', 'hamstrings', 'dumbbell', 'intermediate', 'Hinge at hips, keep legs slightly bent', 4.5],
        ['Overhead Press', 'Barbell shoulder press', 'shoulders', 'deltoids', 'barbell', 'intermediate', 'Press bar overhead from shoulders', 4.5],
        ['Lateral Raise', 'Dumbbell lateral raise', 'shoulders', 'side delts', 'dumbbell', 'beginner', 'Raise dumbbells to sides to shoulder height', 2.5],
        ['Face Pull', 'Cable face pull for rear delts', 'shoulders', 'rear delts', 'cable', 'beginner', 'Pull cable rope toward face', 3.0],
        ['Bicep Curl', 'Dumbbell bicep curl', 'arms', 'biceps', 'dumbbell', 'beginner', 'Curl dumbbells toward shoulders', 2.5],
        ['Tricep Pushdown', 'Cable tricep pushdown', 'arms', 'triceps', 'cable', 'beginner', 'Push cable down extending arms fully', 2.5],
        ['Plank', 'Core stability exercise', 'core', 'abs', 'bodyweight', 'beginner', 'Hold straight body position on forearms', 2.0],
        ['Russian Twist', 'Oblique rotation exercise', 'core', 'obliques', 'bodyweight', 'beginner', 'Rotate torso side to side with feet raised', 3.0],
        ['Running', 'Cardio running', 'cardio', 'full body', 'none', 'beginner', 'Run at steady or interval pace', 7.0],
        ['Jump Rope', 'Jump rope cardio', 'cardio', 'full body', 'jump rope', 'beginner', 'Jump rope at moderate pace', 8.0],
    ];
    $stmt = $db->prepare("INSERT INTO exercise_library (name, description, category, muscle_group, equipment, difficulty, instructions, calories_burned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $count = 0;
    foreach ($exercises as $ex) {
        $chk = $db->prepare("SELECT id FROM exercise_library WHERE name = ?");
        $chk->execute([$ex[0]]);
        if (!$chk->fetch()) {
            $stmt->execute($ex);
            $count++;
        }
    }
    success(['created' => $count], "$count exercises inserted");
}
