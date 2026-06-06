<?php

function listTickets(): void {
    $auth = requireAuth();
    $db = getDB();

    $status = $_GET['status'] ?? '';

    $where = [];
    $params = [];

    if ($status) {
        $where[] = "st.severity = ?";
        $params[] = $status;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT st.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        $whereClause
        ORDER BY st.created_at DESC
    ");
    $stmt->execute($params);
    $tickets = $stmt->fetchAll();

    $result = array_map(function($t) {
        return [
            'id' => '#' . $t['id'],
            'subject' => $t['subject'],
            'message' => $t['message'],
            'severity' => $t['severity'],
            'userName' => $t['user_name'],
            'createdAt' => $t['created_at'],
        ];
    }, $tickets);

    success($result);
}

function createTicket(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'subject' => 'required|string|min:1|max:255',
        'message' => 'required|string|min:1',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $db->prepare("
        INSERT INTO support_tickets (user_id, subject, message, severity)
        VALUES (?, ?, ?, 'open')
    ")->execute([$auth['sub'], $input['subject'], $input['message']]);

    success(['id' => (int)$db->lastInsertId()], 'Ticket creado', 201);
}

function updateTicket(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Ticket no encontrado', 404);
    }

    if (isset($input['severity'])) {
        $db->prepare("UPDATE support_tickets SET severity = ? WHERE id = ?")
            ->execute([$input['severity'], $id]);
    }

    success(null, 'Ticket actualizado');
}
