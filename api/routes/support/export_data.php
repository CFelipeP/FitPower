<?php
function exportMetrics() {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$auth['sub']]);
    success($stmt->fetchAll());
}

function exportSessions() {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("
        SELECT s.*, 
               (SELECT COUNT(*) FROM exercises e WHERE e.session_id = s.id) as exercises_count
        FROM sessions s 
        WHERE s.user_id = ? OR s.id IN (SELECT session_id FROM session_participants WHERE user_id = ?)
        ORDER BY s.date DESC
    ");
    $stmt->execute([$auth['sub'], $auth['sub']]);
    success($stmt->fetchAll());
}

function exportNutrition() {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY date DESC");
    $stmt->execute([$auth['sub']]);
    success($stmt->fetchAll());
}

function exportAll() {
    $auth = requireAuth();
    $db = getDB();
    
    $metrics = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY created_at DESC");
    $metrics->execute([$auth['sub']]);
    
    $sessions = $db->prepare("
        SELECT s.*, 
               (SELECT COUNT(*) FROM exercises e WHERE e.session_id = s.id) as exercises_count
        FROM sessions s 
        WHERE s.user_id = ? OR s.id IN (SELECT session_id FROM session_participants WHERE user_id = ?)
        ORDER BY s.date DESC
    ");
    $sessions->execute([$auth['sub'], $auth['sub']]);
    
    $nutrition = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY date DESC");
    $nutrition->execute([$auth['sub']]);
    
    success([
        'metrics' => $metrics->fetchAll(),
        'sessions' => $sessions->fetchAll(),
        'nutrition' => $nutrition->fetchAll(),
    ]);
}
