<?php
/**
 * Seed: build real workout structures for the existing FitPower Programs using
 * exercises from the imported dataset (source = 'github_exercises_dataset').
 *
 * RULES (per spec):
 *  - No new Programs are created. Only existing, ACTIVE programs are filled.
 *  - Reuses the real structure: programs -> sessions (workouts) -> exercises.
 *  - Exercises come exclusively from exercise_library (dataset), referenced by
 *    exercise_id. No invented exercises, names, weights or providers.
 *  - Idempotent: programs that already have sessions are skipped.
 *
 * Usage: php api/seed_program_workouts.php
 */

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/config.php';

function sw_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';port=' . (defined('DB_PORT') ? DB_PORT : '3306') . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

/** Selection profiles per existing program (id => rules). Muscle groups / equipment
 *  are real values present in exercise_library for source github_exercises_dataset. */
$profiles = [
    1 => [ // HIIT Inferno — High Intensity, intermediate, 8w x4
        'type' => 'hiit',
        'label' => 'HIIT Circuit',
        'equipment' => ['body weight', 'medicine ball', 'rope', 'kettlebell'],
        'muscles' => ['cardiovascular system', 'abs', 'quads', 'glutes', 'calves'],
        'reps' => ['cardio' => '30 sec', 'other' => '15 reps'],
        'sets' => 4,
        'rest' => 'Rest 30-45s',
        'tiers' => [1 => [4, '30 sec'], 5 => [5, '30 sec']],
    ],
    2 => [ // Total Strength — Strength, intermediate, 12w x4
        'type' => 'strength',
        'label' => 'Strength',
        'equipment' => ['barbell', 'dumbbell', 'olympic barbell', 'ez barbell', 'trap bar'],
        'muscles' => ['quads', 'hamstrings', 'pectorals', 'lats', 'upper back', 'delts', 'glutes'],
        'reps' => ['cardio' => '20 reps', 'other' => '10 reps'],
        'sets' => 3,
        'rest' => 'Rest 90s',
        'tiers' => [1 => [3, 10], 5 => [4, 8], 9 => [4, 6]],
    ],
    3 => [ // Upper Body Power — Upper Body, intermediate, 8w x3
        'type' => 'strength',
        'label' => 'Upper Body',
        'equipment' => ['barbell', 'dumbbell', 'cable', 'ez barbell'],
        'muscles' => ['pectorals', 'delts', 'lats', 'upper back', 'biceps', 'triceps', 'traps'],
        'reps' => ['cardio' => '20 reps', 'other' => '10 reps'],
        'sets' => 3,
        'rest' => 'Rest 75s',
        'tiers' => [1 => [3, 10], 5 => [4, 8]],
    ],
    4 => [ // Yoga Flow — Mobility, beginner, 6w x4
        'type' => 'flexibility',
        'label' => 'Flow',
        'equipment' => ['body weight', 'roller'],
        'muscles' => ['spine', 'abs', 'hamstrings', 'glutes', 'quads'],
        'reps' => ['cardio' => '30 sec', 'other' => '30 sec'],
        'sets' => 2,
        'rest' => 'Rest 15-30s',
        'tiers' => [1 => [2, '30 sec']],
    ],
    5 => [ // Cardio Core Blast — Cardio, beginner, 6w x5
        'type' => 'cardio',
        'label' => 'Cardio Core',
        'equipment' => ['body weight', 'rope', 'medicine ball'],
        'muscles' => ['cardiovascular system', 'abs', 'quads', 'glutes'],
        'reps' => ['cardio' => '40 sec', 'other' => '20 reps'],
        'sets' => 3,
        'rest' => 'Rest 30s',
        'tiers' => [1 => [3, '40 sec'], 4 => [4, '40 sec']],
    ],
    6 => [ // Power & Plyo — Plyometrics, advanced, 10w x4
        'type' => 'hiit',
        'label' => 'Power',
        'equipment' => ['body weight', 'medicine ball', 'kettlebell', 'barbell', 'dumbbell'],
        'muscles' => ['quads', 'glutes', 'calves', 'cardiovascular system', 'abs'],
        'reps' => ['cardio' => '20 sec', 'other' => '8 reps'],
        'sets' => 5,
        'rest' => 'Rest 60s',
        'tiers' => [1 => [5, '20 sec'], 5 => [5, 8], 8 => [6, 6]],
    ],
    7 => [ // Bodyweight Mastery — Calisthenics, intermediate, 8w x3
        'type' => 'strength',
        'label' => 'Bodyweight',
        'equipment' => ['body weight', 'assisted'],
        'muscles' => ['pectorals', 'lats', 'quads', 'glutes', 'abs', 'triceps', 'biceps', 'upper back'],
        'reps' => ['cardio' => '20 reps', 'other' => '10 reps'],
        'sets' => 3,
        'rest' => 'Rest 60s',
        'tiers' => [1 => [3, 10], 5 => [4, 12]],
    ],
];

$db = sw_db();

// Only existing ACTIVE programs. The dataset is the single exercise source.
$programs = $db->query("SELECT id, name, trainer_id, tag, weeks, sessions_per_week, difficulty, created_at FROM programs WHERE status = 'active' ORDER BY id")->fetchAll();

$report = [];
foreach ($programs as $p) {
    $id = (int)$p['id'];
    $existing = (int)$db->prepare("SELECT COUNT(*) FROM sessions WHERE program_id = ?")->execute([$id]);
    $stmt = $db->prepare("SELECT COUNT(*) FROM sessions WHERE program_id = ?");
    $stmt->execute([$id]);
    $existing = (int)$stmt->fetchColumn();

    if ($existing > 0) {
        $report[] = "PROGRAM #{$id} {$p['name']}: SKIPPED (already has {$existing} workouts)";
        continue;
    }

    $profile = $profiles[$id] ?? null;
    if (!$profile) {
        $report[] = "PROGRAM #{$id} {$p['name']}: SKIPPED (no selection profile)";
        continue;
    }

    $weeks = max(1, (int)$p['weeks']);
    $spw = max(1, (int)$p['sessions_per_week']);

    // Exercise pool from the dataset matching this program's profile.
    $placeholders = implode(',', array_fill(0, count($profile['equipment']), '?'));
    $params = array_merge($profile['equipment'], $profile['muscles']);
    $musclePlaceholders = implode(',', array_fill(0, count($profile['muscles']), '?'));
    $poolStmt = $db->prepare("
        SELECT id, name, muscle_group
        FROM exercise_library
        WHERE source = 'github_exercises_dataset'
          AND equipment IN ($placeholders)
          AND muscle_group IN ($musclePlaceholders)
        ORDER BY name
    ");
    $poolStmt->execute(array_merge($profile['equipment'], $profile['muscles']));
    $pool = $poolStmt->fetchAll();
    $poolCount = count($pool);

    if ($poolCount === 0) {
        $report[] = "PROGRAM #{$id} {$p['name']}: SKIPPED (empty exercise pool)";
        continue;
    }

    $cursor = 0;
    $anchor = new DateTime($p['created_at'] ?? date('Y-m-d'));
    $anchor->modify('monday this week');
    $dayOffsets = []; // spread workouts across the week so rest days exist
    for ($d = 0; $d < $spw; $d++) {
        $dayOffsets[] = (int)round($d * 7 / $spw);
    }

    $db->beginTransaction();
    try {
        $totalWorkouts = $weeks * $spw;
        $inserted = 0;
        for ($w = 1; $w <= $weeks; $w++) {
            // Progression tier for this week.
            $tier = $profile['sets'];
            foreach ($profile['tiers'] as $tw => $tspec) {
                if ($w >= $tw) $tier = $tspec;
            }
            [$sets, $baseReps] = $tier;

            for ($d = 0; $d < $spw; $d++) {
                $dayDate = clone $anchor;
                $dayDate->modify('+' . (($w - 1) * 7 + $dayOffsets[$d]) . ' days');

                // Pick exercises for this workout (rotation across the pool).
                $chosen = [];
                $n = min(6, $poolCount);
                for ($k = 0; $k < $n; $k++) {
                    $chosen[] = $pool[$cursor % $poolCount];
                    $cursor++;
                }

                $dayLabel = 'Day ' . ($d + 1);
                $title = "Week {$w} · {$dayLabel} — {$profile['label']}";

                $db->prepare("
                    INSERT INTO sessions (user_id, program_id, trainer_id, title, description, date, start_time, end_time, type, status)
                    VALUES (NULL, ?, ?, ?, ?, ?, '07:00:00', '08:00:00', ?, 'scheduled')
                ")->execute([
                    $id,
                    $p['trainer_id'] ? (int)$p['trainer_id'] : null,
                    $title,
                    $profile['label'] . ' workout for ' . $p['name'],
                    $dayDate->format('Y-m-d'),
                    $profile['type'],
                ]);
                $sessionId = (int)$db->lastInsertId();

                $exStmt = $db->prepare("
                    INSERT INTO exercises (session_id, name, sets, reps, weight, notes, sort_order, exercise_id)
                    VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
                ");
                foreach ($chosen as $i => $ex) {
                    $isCardio = $ex['muscle_group'] === 'cardiovascular system';
                    $reps = is_array($baseReps) ? $baseReps['cardio'] : $baseReps;
                    $reps = $isCardio && !is_string($reps) ? $profile['reps']['cardio'] : (string)$reps;
                    if (!is_string($reps)) $reps = (string)$reps;
                    $exStmt->execute([
                        $sessionId,
                        $ex['name'],
                        $sets,
                        $reps,
                        $profile['rest'],
                        $i + 1,
                        (int)$ex['id'],
                    ]);
                }
                $inserted++;
            }
        }
        $db->commit();
        $report[] = "PROGRAM #{$id} {$p['name']}: OK — {$inserted} workouts, " . ($totalWorkouts) . " expected (weeks={$weeks} spw={$spw}), pool={$poolCount}";
    } catch (\Throwable $e) {
        $db->rollBack();
        $report[] = "PROGRAM #{$id} {$p['name']}: FAILED — " . $e->getMessage();
    }
}

echo "\n=== SEED PROGRAM WORKOUTS ===\n";
foreach ($report as $line) echo $line . "\n";

// Integrity check
$totalSessions = (int)$db->query("SELECT COUNT(*) FROM sessions WHERE program_id IS NOT NULL")->fetchColumn();
$withExercises = (int)$db->query("SELECT COUNT(DISTINCT session_id) FROM exercises WHERE exercise_id IS NOT NULL AND session_id IN (SELECT id FROM sessions WHERE program_id IS NOT NULL)")->fetchColumn();
$linked = (int)$db->query("SELECT COUNT(*) FROM exercises WHERE exercise_id IS NOT NULL")->fetchColumn();
echo "\nProgram workouts (sessions with program_id): {$totalSessions}\n";
echo "Sessions with linked dataset exercises: {$withExercises}\n";
echo "Exercise rows linked to exercise_library (exercise_id): {$linked}\n";
