<?php

function exportProgram(string $id): void {
    $auth = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        SELECT p.*, CONCAT(t.first_name, ' ', t.last_name) as trainer_name
        FROM programs p LEFT JOIN trainers t ON t.id = p.trainer_id WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $program = $stmt->fetch();
    if (!$program) error('Programa no encontrado', 404);

    $sessionStmt = $db->prepare("SELECT * FROM sessions WHERE program_id = ? ORDER BY date, start_time");
    $sessionStmt->execute([$id]);
    $sessions = $sessionStmt->fetchAll();

    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="program-' . $id . '-export.json"');
    echo json_encode([
        'program' => $program,
        'sessions' => $sessions,
        'exported_at' => date('Y-m-d H:i:s'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}
