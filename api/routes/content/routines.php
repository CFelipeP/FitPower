<?php

function getDailyRoutine(): void {
    $auth = requireAuth();
    $db = getDB();
    $date = $_GET['date'] ?? date('Y-m-d');

    $stmt = $db->prepare("SELECT * FROM smart_routines WHERE user_id = ? AND routine_date = ?");
    $stmt->execute([$auth['sub'], $date]);
    $routine = $stmt->fetch();

    if ($routine) {
        $routine['exercises'] = json_decode($routine['exercises'] ?? '[]', true);
        success($routine);
        return;
    }

    $userStmt = $db->prepare("SELECT fitness_level, primary_goal, training_days FROM users WHERE id = ?");
    $userStmt->execute([$auth['sub']]);
    $user = $userStmt->fetch();

    $level = $user['fitness_level'] ?? 'beginner';
    $goal = $user['primary_goal'] ?? 'muscle';
    $days = (int)($user['training_days'] ?? 4);

    $weekDay = date('N');
    $focuses = ['upper', 'lower', 'push', 'pull', 'full', 'cardio', 'core'];
    $focus = $focuses[($weekDay - 1) % count($focuses)];

    $exercises = generateExercises($level, $goal, $focus);
    $duration = $level === 'beginner' ? 30 : ($level === 'intermediate' ? 45 : 60);

    $title = ucfirst($focus) . ' Body ' . ($goal === 'fat-loss' ? 'Burn' : 'Build');

    $db->prepare("
        INSERT INTO smart_routines (user_id, routine_date, title, focus, duration_minutes, difficulty, exercises)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ")->execute([$auth['sub'], $date, $title, $focus, $duration, $level, json_encode($exercises)]);

    success([
        'id' => (int)$db->lastInsertId(),
        'routine_date' => $date,
        'title' => $title,
        'focus' => $focus,
        'duration_minutes' => $duration,
        'difficulty' => $level,
        'exercises' => $exercises,
        'is_completed' => 0,
    ]);
}

function completeRoutine(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = ['date' => 'string'];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $date = $input['date'] ?? date('Y-m-d');

    $db = getDB();
    $db->prepare("UPDATE smart_routines SET is_completed = 1, completed_at = NOW() WHERE user_id = ? AND routine_date = ?")
        ->execute([$auth['sub'], $date]);

    updateLeaderboardPoints($auth['sub'], 'workouts_completed', 20);

    $db->prepare("INSERT INTO leaderboard_entries (user_id, points, workouts_completed, updated_at) 
        VALUES (?, 15, 1, NOW()) 
        ON DUPLICATE KEY UPDATE points = points + 15, workouts_completed = workouts_completed + 1, updated_at = NOW()")
        ->execute([$auth['sub']]);
    require_once __DIR__ . '/../gamification/achievements.php';
    checkAndUnlockAchievements();

    $routineStmt = $db->prepare("SELECT title FROM smart_routines WHERE user_id = ? AND routine_date = ?");
    $routineStmt->execute([$auth['sub'], $date]);
    $routine = $routineStmt->fetch();
    require_once __DIR__ . '/../../helpers/activity.php';
    logActivity($auth['sub'], 'workout', 'Rutina completada: ' . ($routine['title'] ?? 'Daily Routine'), 'Dumbbell', '#10b981', 'Done', 'bg-success');

    success(null, 'Rutina completada');
}

function generateExercises(string $level, string $goal, string $focus): array {
    $libraries = [
        'upper' => [
            ['name' => 'Bench Press', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Overhead Press', 'sets' => 3, 'reps' => '12', 'rest' => 45],
            ['name' => 'Bent Over Rows', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Pull Ups', 'sets' => 3, 'reps' => '8', 'rest' => 60],
            ['name' => 'Lateral Raises', 'sets' => 3, 'reps' => '15', 'rest' => 30],
            ['name' => 'Bicep Curls', 'sets' => 3, 'reps' => '12', 'rest' => 30],
            ['name' => 'Tricep Pushdowns', 'sets' => 3, 'reps' => '12', 'rest' => 30],
        ],
        'lower' => [
            ['name' => 'Squats', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Romanian Deadlifts', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Leg Press', 'sets' => 3, 'reps' => '12', 'rest' => 45],
            ['name' => 'Walking Lunges', 'sets' => 3, 'reps' => '10/leg', 'rest' => 45],
            ['name' => 'Calf Raises', 'sets' => 4, 'reps' => '15', 'rest' => 30],
            ['name' => 'Leg Curls', 'sets' => 3, 'reps' => '12', 'rest' => 30],
        ],
        'push' => [
            ['name' => 'Incline Bench Press', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Shoulder Press', 'sets' => 3, 'reps' => '12', 'rest' => 45],
            ['name' => 'Dips', 'sets' => 3, 'reps' => '10', 'rest' => 45],
            ['name' => 'Push Ups', 'sets' => 3, 'reps' => '15', 'rest' => 30],
            ['name' => 'Front Raises', 'sets' => 3, 'reps' => '12', 'rest' => 30],
        ],
        'pull' => [
            ['name' => 'Deadlifts', 'sets' => 4, 'reps' => '8', 'rest' => 90],
            ['name' => 'Lat Pulldowns', 'sets' => 4, 'reps' => '10', 'rest' => 60],
            ['name' => 'Seated Rows', 'sets' => 3, 'reps' => '12', 'rest' => 45],
            ['name' => 'Face Pulls', 'sets' => 3, 'reps' => '15', 'rest' => 30],
            ['name' => 'Hammer Curls', 'sets' => 3, 'reps' => '12', 'rest' => 30],
        ],
        'full' => [
            ['name' => 'Clean & Press', 'sets' => 3, 'reps' => '8', 'rest' => 90],
            ['name' => 'Goblet Squats', 'sets' => 3, 'reps' => '12', 'rest' => 45],
            ['name' => 'Push Ups', 'sets' => 3, 'reps' => '15', 'rest' => 30],
            ['name' => 'Kettlebell Swings', 'sets' => 3, 'reps' => '15', 'rest' => 30],
            ['name' => 'Plank', 'sets' => 3, 'reps' => '45s', 'rest' => 30],
            ['name' => 'Mountain Climbers', 'sets' => 3, 'reps' => '20', 'rest' => 20],
        ],
        'cardio' => [
            ['name' => 'Jump Rope', 'sets' => 3, 'reps' => '60s', 'rest' => 15],
            ['name' => 'Burpees', 'sets' => 3, 'reps' => '12', 'rest' => 20],
            ['name' => 'High Knees', 'sets' => 3, 'reps' => '30s', 'rest' => 15],
            ['name' => 'Box Jumps', 'sets' => 3, 'reps' => '10', 'rest' => 30],
            ['name' => 'Row Machine', 'sets' => 3, 'reps' => '45s', 'rest' => 15],
        ],
        'core' => [
            ['name' => 'Plank', 'sets' => 3, 'reps' => '60s', 'rest' => 20],
            ['name' => 'Russian Twists', 'sets' => 3, 'reps' => '20', 'rest' => 20],
            ['name' => 'Leg Raises', 'sets' => 3, 'reps' => '15', 'rest' => 20],
            ['name' => 'Crunches', 'sets' => 3, 'reps' => '20', 'rest' => 15],
            ['name' => 'Bicycle Kicks', 'sets' => 3, 'reps' => '20', 'rest' => 15],
            ['name' => 'Dead Bug', 'sets' => 3, 'reps' => '10/side', 'rest' => 20],
        ],
    ];

    $selected = $libraries[$focus] ?? $libraries['full'];
    $count = $level === 'beginner' ? 4 : ($level === 'intermediate' ? 5 : 6);
    shuffle($selected);

    return array_slice($selected, 0, $count);
}
