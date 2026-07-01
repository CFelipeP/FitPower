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
        WHERE s.id IN (SELECT session_id FROM session_participants WHERE user_id = ?)
        ORDER BY s.date DESC
    ");
    $stmt->execute([$auth['sub']]);
    success($stmt->fetchAll());
}

function exportNutrition() {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY log_date DESC");
    $stmt->execute([$auth['sub']]);
    success($stmt->fetchAll());
}

function exportAll() {
    $auth = requireAuth();
    $db = getDB();
    
    $metricsData = [];
    $metrics = $db->prepare("SELECT * FROM body_metrics WHERE user_id = ? ORDER BY created_at DESC");
    $metrics->execute([$auth['sub']]);
    $metricsData = $metrics->fetchAll();
    
    $sessionsData = [];
    $sessions = $db->prepare("
        SELECT s.*, 
               (SELECT COUNT(*) FROM exercises e WHERE e.session_id = s.id) as exercises_count
        FROM sessions s 
        WHERE s.id IN (SELECT session_id FROM session_participants WHERE user_id = ?)
        ORDER BY s.date DESC
    ");
    $sessions->execute([$auth['sub']]);
    $sessionsData = $sessions->fetchAll();
    
    $nutritionData = [];
    $nutrition = $db->prepare("SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY log_date DESC");
    $nutrition->execute([$auth['sub']]);
    $nutritionData = $nutrition->fetchAll();
    
    success([
        'metrics' => $metricsData,
        'sessions' => $sessionsData,
        'nutrition' => $nutritionData,
    ]);
}
