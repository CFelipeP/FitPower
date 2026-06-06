<?php

function updateWater(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $glasses = (int)($input['glasses'] ?? 0);
    if ($glasses < 0 || $glasses > 20) error('Valor inválido', 400);

    $db = getDB();
    $stmt = $db->prepare("SELECT id, water_glasses FROM nutrition_logs WHERE user_id = ? AND log_date = CURDATE()");
    $stmt->execute([$auth['sub']]);
    $existing = $stmt->fetch();

    if ($existing) {
        $db->prepare("UPDATE nutrition_logs SET water_glasses = ? WHERE id = ?")->execute([$glasses, $existing['id']]);
    } else {
        $db->prepare("INSERT INTO nutrition_logs (user_id, log_date, water_glasses) VALUES (?, CURDATE(), ?)")
            ->execute([$auth['sub'], $glasses]);
    }

    success(['glasses' => $glasses], 'Agua actualizada');
}
