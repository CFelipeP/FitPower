<?php
/**
 * Program access control — the single authority for what a user may see.
 *
 * A USER may only access exercises that belong to Programs they are actively
 * enrolled in. Coaches/admins manage the global exercise library and Programs.
 */

function userCanAccessProgram(PDO $db, int $userId, int $programId): bool {
    $stmt = $db->prepare("SELECT id FROM user_programs WHERE user_id = ? AND program_id = ? AND status = 'active'");
    $stmt->execute([$userId, $programId]);
    return (bool)$stmt->fetch();
}

/** Exercise ids a user may see: only those inside their active Programs' workouts. */
function userAccessibleExerciseIds(PDO $db, int $userId): array {
    $stmt = $db->prepare("
        SELECT DISTINCT e.exercise_id
        FROM exercises e
        JOIN sessions s ON s.id = e.session_id
        JOIN programs p ON p.id = s.program_id
        JOIN user_programs up ON up.program_id = p.id AND up.status = 'active'
        WHERE up.user_id = ? AND e.exercise_id IS NOT NULL
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/** True when the user's role manages the exercise library (coach/admin). */
function managesExerciseLibrary(?string $role): bool {
    return in_array($role, ['coach', 'admin'], true);
}
