<?php

function listExercises(): void {
    $auth = requireAuth();
    $db = getDB();
    $category = $_GET['category'] ?? '';
    $muscle = $_GET['muscle'] ?? '';
    $search = $_GET['search'] ?? '';
    $where = [];
    $params = [];
    if ($category) { $where[] = "category = ?"; $params[] = $category; }
    if ($muscle) { $where[] = "muscle_group = ?"; $params[] = $muscle; }
    if ($search) { $where[] = "(name LIKE ? OR description LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM exercise_library $whereClause ORDER BY category, name");
    $stmt->execute($params);
    $result = array_map(function($e) {
        return [
            'id' => (int)$e['id'],
            'name' => $e['name'],
            'description' => $e['description'],
            'category' => $e['category'],
            'muscleGroup' => $e['muscle_group'],
            'equipment' => $e['equipment'],
            'difficulty' => $e['difficulty'],
            'videoUrl' => $e['video_url'],
            'imageUrl' => $e['image_url'],
            'instructions' => $e['instructions'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function createExercise(): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'])) {
        error('Solo entrenadores y administradores pueden crear ejercicios', 403);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $category = trim($input['category'] ?? '');
    $muscleGroup = trim($input['muscleGroup'] ?? '');
    $equipment = trim($input['equipment'] ?? '');
    $difficulty = trim($input['difficulty'] ?? 'beginner');
    $instructions = trim($input['instructions'] ?? '');
    $videoUrl = trim($input['videoUrl'] ?? '');
    $imageUrl = trim($input['imageUrl'] ?? '');

    if (!$name || !$category) {
        error('Nombre y categoría son requeridos', 422);
    }

    $db = getDB();
    $chk = $db->prepare("SELECT id FROM exercise_library WHERE name = ?");
    $chk->execute([$name]);
    if ($chk->fetch()) {
        error('Ya existe un ejercicio con ese nombre', 409);
    }

    $stmt = $db->prepare(
        "INSERT INTO exercise_library (name, description, category, muscle_group, equipment, difficulty, instructions, video_url, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$name, $description, $category, $muscleGroup, $equipment, $difficulty, $instructions, $videoUrl, $imageUrl]);
    $id = $db->lastInsertId();

    success([
        'id' => (int)$id,
        'name' => $name,
        'description' => $description,
        'category' => $category,
        'muscleGroup' => $muscleGroup,
        'equipment' => $equipment,
        'difficulty' => $difficulty,
        'instructions' => $instructions,
    ], 'Ejercicio creado exitosamente');
}

function updateExercise(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'])) {
        error('Solo entrenadores y administradores pueden modificar ejercicios', 403);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $chk = $db->prepare("SELECT id FROM exercise_library WHERE id = ?");
    $chk->execute([$id]);
    if (!$chk->fetch()) {
        error('Ejercicio no encontrado', 404);
    }

    $fields = [];
    $params = [];
    foreach (['name' => 'name', 'description' => 'description', 'category' => 'category',
              'muscleGroup' => 'muscle_group', 'equipment' => 'equipment',
              'difficulty' => 'difficulty', 'instructions' => 'instructions',
              'videoUrl' => 'video_url', 'imageUrl' => 'image_url'] as $inputKey => $dbCol) {
        if (isset($input[$inputKey])) {
            $fields[] = "$dbCol = ?";
            $params[] = trim($input[$inputKey]);
        }
    }
    if (empty($fields)) {
        error('No hay campos para actualizar', 422);
    }

    $params[] = $id;
    $db->prepare("UPDATE exercise_library SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    success(null, 'Ejercicio actualizado');
}

function deleteExercise(string $id): void {
    $auth = requireAuth();
    if (!in_array($auth['role'] ?? '', ['admin', 'coach'])) {
        error('Solo entrenadores y administradores pueden eliminar ejercicios', 403);
    }
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM exercise_library WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        error('Ejercicio no encontrado', 404);
    }
    success(null, 'Ejercicio eliminado');
}

function seedExercises(): void {
    $auth = requireAuth();
    $db = getDB();
    $exercises = [
        ['Bench Press', 'Barbell bench press for chest', 'chest', 'pectorals', 'barbell', 'intermediate', 'Lie on bench, lower bar to chest, press up'],
        ['Push Up', 'Bodyweight chest exercise', 'chest', 'pectorals', 'bodyweight', 'beginner', 'Keep body straight, lower chest to ground'],
        ['Incline Dumbbell Press', 'Dumbbell press on incline bench', 'chest', 'upper chest', 'dumbbell', 'intermediate', 'Press dumbbells up from chest level'],
        ['Deadlift', 'Full body compound lift', 'back', 'full back', 'barbell', 'advanced', 'Hip hinge, pull bar up along legs'],
        ['Pull Up', 'Bodyweight back exercise', 'back', 'lats', 'bodyweight', 'intermediate', 'Pull chin over bar with controlled motion'],
        ['Barbell Row', 'Bent over row for back', 'back', 'mid back', 'barbell', 'intermediate', 'Row bar to lower chest with straight back'],
        ['Squat', 'Barbell squat for legs', 'legs', 'quadriceps', 'barbell', 'intermediate', 'Lower hips below parallel, keep chest up'],
        ['Leg Press', 'Machine leg press', 'legs', 'quadriceps', 'machine', 'beginner', 'Push platform away with legs'],
        ['Romanian Deadlift', 'Hamstring focused deadlift', 'legs', 'hamstrings', 'dumbbell', 'intermediate', 'Hinge at hips, keep legs slightly bent'],
        ['Overhead Press', 'Barbell shoulder press', 'shoulders', 'deltoids', 'barbell', 'intermediate', 'Press bar overhead from shoulders'],
        ['Lateral Raise', 'Dumbbell lateral raise', 'shoulders', 'side delts', 'dumbbell', 'beginner', 'Raise dumbbells to sides to shoulder height'],
        ['Face Pull', 'Cable face pull for rear delts', 'shoulders', 'rear delts', 'cable', 'beginner', 'Pull cable rope toward face'],
        ['Bicep Curl', 'Dumbbell bicep curl', 'arms', 'biceps', 'dumbbell', 'beginner', 'Curl dumbbells toward shoulders'],
        ['Tricep Pushdown', 'Cable tricep pushdown', 'arms', 'triceps', 'cable', 'beginner', 'Push cable down extending arms fully'],
        ['Plank', 'Core stability exercise', 'core', 'abs', 'bodyweight', 'beginner', 'Hold straight body position on forearms'],
        ['Russian Twist', 'Oblique rotation exercise', 'core', 'obliques', 'bodyweight', 'beginner', 'Rotate torso side to side with feet raised'],
        ['Running', 'Cardio running', 'cardio', 'full body', 'none', 'beginner', 'Run at steady or interval pace'],
        ['Jump Rope', 'Jump rope cardio', 'cardio', 'full body', 'jump rope', 'beginner', 'Jump rope at moderate pace'],
    ];
    $stmt = $db->prepare("INSERT INTO exercise_library (name, description, category, muscle_group, equipment, difficulty, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $count = 0;
    foreach ($exercises as $ex) {
        $chk = $db->prepare("SELECT id FROM exercise_library WHERE name = ?");
        $chk->execute([$ex[0]]);
        if (!$chk->fetch()) {
            $stmt->execute($ex);
            $count++;
        }
    }
    success(['created' => $count], "$count ejercicios insertados");
}
