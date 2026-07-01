<?php

function listTickets(): void {
    $auth = requireAuth();
    $db = getDB();
    $isAdmin = $auth['role'] === 'admin';

    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';

    $where = [];
    $params = [];

    if (!$isAdmin) {
        $where[] = "st.user_id = ?";
        $params[] = $auth['sub'];
    }

    if ($status) {
        $where[] = "st.severity = ?";
        $params[] = $status;
    }

    if ($search) {
        $where[] = "(st.subject LIKE ? OR st.message LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT st.*, CONCAT(u.first_name, ' ', u.last_name) as user_name,
               CONCAT(a.first_name, ' ', a.last_name) as assigned_name
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        LEFT JOIN users a ON a.id = st.assigned_to
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
            'assignedTo' => $t['assigned_name'],
            'createdAt' => $t['created_at'],
            'updatedAt' => $t['updated_at'],
        ];
    }, $tickets);

    success($result);
}

function createTicket(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'subject' => 'required|string|min:1|max:255',
        'message' => 'required|string|min:1|max:10000',
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
    $isAdmin = $auth['role'] === 'admin';

    $stmt = $db->prepare("SELECT * FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();

    if (!$ticket) {
        error('Ticket no encontrado', 404);
    }

    if (!$isAdmin && $ticket['user_id'] != $auth['sub']) {
        error('No tienes permisos para modificar este ticket', 403);
    }

    $updates = [];
    $params = [];

    if (isset($input['severity'])) {
        $errors = validate(['severity' => $input['severity']], ['severity' => 'in:open,in_progress,critical,resolved,closed']);
        if ($errors) {
            error('Error de validación', 422, $errors);
        }
        $updates[] = "severity = ?";
        $params[] = $input['severity'];
    }

    if ($isAdmin) {
        if (isset($input['assigned_to'])) {
            $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$input['assigned_to']]);
            if (!$stmt->fetch()) {
                error('Usuario asignado no encontrado', 404);
            }
            $updates[] = "assigned_to = ?";
            $params[] = $input['assigned_to'];
        }
        if (isset($input['admin_note'])) {
            $errors = validate(['admin_note' => $input['admin_note']], ['admin_note' => 'string|max:1000']);
            if ($errors) {
                error('Error de validación', 422, $errors);
            }
            $updates[] = "admin_note = ?";
            $params[] = $input['admin_note'];
        }
    }

    if (empty($updates)) {
        error('No hay campos para actualizar', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE support_tickets SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    success(null, 'Ticket actualizado');
}

// --- Admin Ticket Management ---

function adminListTickets(): void {
    requireRole('admin');
    listTickets();
}

function adminReplyTicket(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    $rules = ['message' => 'required|string|min:1|max:10000'];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $stmt = $db->prepare("SELECT id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Ticket no encontrado', 404);
    }

    $stmt = $db->prepare("
        INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin)
        VALUES (?, ?, ?, 1)
    ");
    $stmt->execute([$id, $auth['sub'], $input['message']]);

    $ticketStmt = $db->prepare("SELECT user_id FROM support_tickets WHERE id = ?");
    $ticketStmt->execute([$id]);
    $ticketOwnerId = $ticketStmt->fetchColumn();
    $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) VALUES (?, 'ticket', 'Respuesta a tu ticket', ?, 'MessageCircle', '/client/dashboard', NOW())")->execute([$ticketOwnerId, 'El administrador ha respondido a tu ticket #' . $id]);

    $db->prepare("UPDATE support_tickets SET severity = 'in_progress', updated_at = NOW() WHERE id = ? AND severity NOT IN ('resolved', 'closed')")
        ->execute([$id]);

    logAdminAction($auth['sub'], 'reply_ticket', 'ticket', (int)$id, null);

    $stmt = $db->prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC");
    $stmt->execute([$id]);
    $replies = $stmt->fetchAll();

    success([
        'replies' => array_map(function($r) {
            return [
                'id' => (int)$r['id'],
                'userId' => (int)$r['user_id'],
                'message' => $r['message'],
                'createdAt' => $r['created_at'],
            ];
        }, $replies),
    ], 'Respuesta agregada', 201);
}

function adminGetTicketReplies(string $id): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Ticket no encontrado', 404);
    }

    $stmt = $db->prepare("
        SELECT tr.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM ticket_replies tr
        LEFT JOIN users u ON u.id = tr.user_id
        WHERE tr.ticket_id = ?
        ORDER BY tr.created_at ASC
    ");
    $stmt->execute([$id]);
    $replies = $stmt->fetchAll();

    success(array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'userId' => (int)$r['user_id'],
            'userName' => $r['user_name'],
            'message' => $r['message'],
            'createdAt' => $r['created_at'],
        ];
    }, $replies));
}
