<?php

function listGoals(): void {
    $auth = requireAuth();
    $db = getDB();
    $status = $_GET['status'] ?? '';
    $where = "WHERE user_id = ?";
    $params = [$auth['sub']];
    if ($status) {
        $where .= " AND status = ?";
        $params[] = $status;
    }
    $stmt = $db->prepare("SELECT * FROM client_goals $where ORDER BY created_at DESC");
    $stmt->execute($params);
    $result = array_map(function($g) {
        return [
            'id' => (int)$g['id'],
            'title' => $g['title'],
            'description' => $g['description'],
            'targetValue' => $g['target_value'] ? (float)$g['target_value'] : null,
            'currentValue' => $g['current_value'] ? (float)$g['current_value'] : null,
            'unit' => $g['unit'],
            'startDate' => $g['start_date'],
            'targetDate' => $g['target_date'],
            'status' => $g['status'],
            'createdAt' => $g['created_at'],
        ];
    }, $stmt->fetchAll());
    success($result);
}

function createGoal(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = [
        'title' => 'required|string|min:1|max:255',
        'targetValue' => 'numeric|min_value:0',
        'unit' => 'string|max:50',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $db->prepare("INSERT INTO client_goals (user_id, title, description, target_value, current_value, unit, start_date, target_date, status) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'active')")
        ->execute([
            $auth['sub'],
            $input['title'],
            $input['description'] ?? null,
            isset($input['targetValue']) ? (float)$input['targetValue'] : null,
            $input['unit'] ?? 'reps',
            $input['startDate'] ?? date('Y-m-d'),
            $input['targetDate'] ?? null,
        ]);
    success(['id' => (int)$db->lastInsertId()], 'Meta creada', 201);
}

function updateGoal(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM client_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$id, $auth['sub']]);
    if (!$stmt->fetch()) error('Meta no encontrada', 404);
    $fieldMap = [
        'title' => 'title',
        'description' => 'description',
        'targetValue' => 'target_value',
        'currentValue' => 'current_value',
        'unit' => 'unit',
        'startDate' => 'start_date',
        'targetDate' => 'target_date',
        'status' => 'status',
    ];
    $updates = [];
    $params = [];
    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }
    if (empty($updates)) error('No hay campos para actualizar', 400);
    $params[] = (int)$id;
    $params[] = $auth['sub'];
    $db->prepare("UPDATE client_goals SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?")->execute($params);
    success(null, 'Meta actualizada');
}

function deleteGoal(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM client_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$id, $auth['sub']]);
    if (!$stmt->fetch()) error('Meta no encontrada', 404);
    $db->prepare("DELETE FROM client_goals WHERE id = ? AND user_id = ?")->execute([(int)$id, $auth['sub']]);
    success(null, 'Meta eliminada');
}

function listMilestones(string $goalId): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM client_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$goalId, $auth['sub']]);
    if (!$stmt->fetch()) error('Meta no encontrada', 404);
    $ms = $db->prepare("SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY order_index ASC");
    $ms->execute([(int)$goalId]);
    success(array_map(function($m) {
        return [
            'id' => (int)$m['id'],
            'goalId' => (int)$m['goal_id'],
            'title' => $m['title'],
            'targetValue' => (float)$m['target_value'],
            'currentValue' => (float)$m['current_value'],
            'unit' => $m['unit'],
            'orderIndex' => (int)$m['order_index'],
            'achieved' => (bool)$m['achieved'],
            'achievedAt' => $m['achieved_at'],
        ];
    }, $ms->fetchAll()));
}

function createMilestone(string $goalId): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['title' => 'required|string|min:1|max:255'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM client_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$goalId, $auth['sub']]);
    if (!$stmt->fetch()) error('Meta no encontrada', 404);
    $order = $db->prepare("SELECT COALESCE(MAX(order_index), -1) + 1 FROM goal_milestones WHERE goal_id = ?");
    $order->execute([(int)$goalId]);
    $nextOrder = (int)$order->fetchColumn();
    $db->prepare("INSERT INTO goal_milestones (goal_id, title, target_value, current_value, unit, order_index) VALUES (?, ?, ?, 0, ?, ?)")
        ->execute([(int)$goalId, $input['title'], isset($input['targetValue']) ? (float)$input['targetValue'] : 1, $input['unit'] ?? 'reps', $nextOrder]);
    success(['id' => (int)$db->lastInsertId()], 'Hito creado', 201);
}

function updateMilestone(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();
    $chk = $db->prepare("SELECT gm.id FROM goal_milestones gm JOIN client_goals g ON g.id = gm.goal_id WHERE gm.id = ? AND g.user_id = ?");
    $chk->execute([(int)$id, $auth['sub']]);
    if (!$chk->fetch()) error('Hito no encontrado', 404);
    $updates = [];
    $params = [];
    foreach (['title' => 'title', 'targetValue' => 'target_value', 'currentValue' => 'current_value', 'unit' => 'unit', 'orderIndex' => 'order_index', 'achieved' => 'achieved'] as $inputKey => $dbCol) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbCol = ?";
            $params[] = $inputKey === 'achieved' ? ($input[$inputKey] ? 1 : 0) : $input[$inputKey];
        }
    }
    if (isset($input['achieved']) && $input['achieved']) {
        $updates[] = "achieved_at = NOW()";
    } elseif (isset($input['achieved']) && !$input['achieved']) {
        $updates[] = "achieved_at = NULL";
    }
    if (empty($updates)) error('No hay campos para actualizar', 400);
    $params[] = (int)$id;
    $db->prepare("UPDATE goal_milestones SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    success(null, 'Hito actualizado');
}

function deleteMilestone(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $chk = $db->prepare("SELECT gm.id FROM goal_milestones gm JOIN client_goals g ON g.id = gm.goal_id WHERE gm.id = ? AND g.user_id = ?");
    $chk->execute([(int)$id, $auth['sub']]);
    if (!$chk->fetch()) error('Hito no encontrado', 404);
    $db->prepare("DELETE FROM goal_milestones WHERE id = ?")->execute([(int)$id]);
    success(null, 'Hito eliminado');
}
