<?php

/**
 * Program progress helpers — single source of truth for how much of a Program a
 * user has completed. Completion is persisted per-user in session_progress.
 */

/**
 * Returns per-user completion for the given program sessions.
 * @return array<int,bool> sessionId => completed
 */
function loadProgramSessionCompletion(PDO $db, int $userId, int $programId): array {
    $stmt = $db->prepare("
        SELECT sp.session_id, sp.completed
        FROM session_progress sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE s.program_id = ? AND sp.user_id = ?
    ");
    $stmt->execute([$programId, $userId]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $out[(int)$r['session_id']] = (bool)$r['completed'];
    }
    return $out;
}

/**
 * Ordered program workouts (sessions) with their week/day computed from the
 * real scheduled order. Returns rows with 'week' and 'day'.
 */
function loadProgramWorkouts(PDO $db, int $programId): array {
    $stmt = $db->prepare("
        SELECT id, title, date, start_time
        FROM sessions
        WHERE program_id = ?
        ORDER BY date, start_time, id
    ");
    $stmt->execute([$programId]);
    $rows = $stmt->fetchAll();
    $spwStmt = $db->prepare("SELECT COALESCE(sessions_per_week, 1) FROM programs WHERE id = ?");
    $spwStmt->execute([$programId]);
    $spw = max(1, (int)$spwStmt->fetchColumn());
    foreach ($rows as $i => $r) {
        $rows[$i]['week'] = intdiv($i, $spw) + 1;
        $rows[$i]['day'] = ($i % $spw) + 1;
    }
    return $rows;
}

/**
 * Computes progress for a user on a program and persists it to user_programs.
 * progress = completed workouts / total workouts (%). current_week = week of the
 * first pending workout. Returns the derived stats.
 */
function recomputeProgramProgress(PDO $db, int $userId, int $programId): array {
    $workouts = loadProgramWorkouts($db, $programId);
    $total = count($workouts);
    $completed = loadProgramSessionCompletion($db, $userId, $programId);

    $completedCount = 0;
    $nextWorkout = null;
    foreach ($workouts as $w) {
        $done = !empty($completed[(int)$w['id']]);
        if ($done) {
            $completedCount++;
        } elseif ($nextWorkout === null) {
            $nextWorkout = $w;
        }
    }
    $progress = $total > 0 ? (int)round($completedCount / $total * 100) : 0;
    $currentWeek = $nextWorkout ? (int)$nextWorkout['week'] : ($total > 0 ? (int)$workouts[$total - 1]['week'] : 1);

    $up = $db->prepare("UPDATE user_programs SET progress = ?, current_week = ? WHERE user_id = ? AND program_id = ?");
    $up->execute([$progress, $currentWeek, $userId, $programId]);

    return [
        'progress' => $progress,
        'completedCount' => $completedCount,
        'totalSessions' => $total,
        'currentWeek' => $currentWeek,
        'nextWorkout' => $nextWorkout ? [
            'id' => (int)$nextWorkout['id'],
            'title' => $nextWorkout['title'],
            'week' => (int)$nextWorkout['week'],
            'day' => (int)$nextWorkout['day'],
        ] : null,
    ];
}
