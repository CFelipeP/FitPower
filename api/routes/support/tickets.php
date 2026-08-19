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
        SELECT st.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email as user_email,
               CONCAT(a.first_name, ' ', a.last_name) as assigned_name
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        LEFT JOIN users a ON a.id = st.assigned_to
        $whereClause
        ORDER BY st.created_at DESC
    ");
    $stmt->execute($params);
    $tickets = $stmt->fetchAll();

    $repliesByTicket = [];
    if ($isAdmin && !empty($tickets)) {
        $ticketIds = array_map('intval', array_column($tickets, 'id'));
        $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $replyStmt = $db->prepare("
            SELECT tr.*, CONCAT(u.first_name, ' ', u.last_name) as admin_name
            FROM ticket_replies tr
            LEFT JOIN users u ON u.id = tr.user_id
            WHERE tr.ticket_id IN ($placeholders)
            ORDER BY tr.created_at ASC
        ");
        $replyStmt->execute($ticketIds);
        foreach ($replyStmt->fetchAll() as $rep) {
            $repliesByTicket[(int)$rep['ticket_id']][] = [
                'id' => (int)$rep['id'],
                'userId' => (int)$rep['user_id'],
                'userName' => $rep['admin_name'],
                'adminName' => $rep['admin_name'],
                'message' => $rep['message'],
                'text' => $rep['message'],
                'createdAt' => $rep['created_at'],
            ];
        }
    }

    $result = array_map(function($t) use ($isAdmin, $repliesByTicket) {
        $ticketId = (int)$t['id'];
        return [
            'id' => $ticketId,
            'subject' => $t['subject'],
            'title' => $t['subject'],
            'message' => $t['message'],
            'description' => $t['message'],
            'desc' => $t['message'],
            'severity' => $t['severity'],
            'status' => $t['severity'],
            'userName' => $t['user_name'],
            'user' => $t['user_name'],
            'email' => $t['user_email'] ?? '',
            'assignedTo' => $t['assigned_name'],
            'createdAt' => $t['created_at'],
            'updatedAt' => $t['updated_at'],
            'replies' => $isAdmin ? ($repliesByTicket[$ticketId] ?? []) : [],
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
        'priority' => 'numeric|min_value:0|max_value:5',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();
    $priority = isset($input['priority']) && is_numeric($input['priority']) ? (int)$input['priority'] : 0;

    // Priority support is a Pro+ feature: requests above the default are
    // rejected server-side, never trusted from the client.
    if ($priority > 0) {
        require_once __DIR__ . '/../../helpers/features.php';
        requireFeature($db, (int)$auth['sub'], 'priority_support');
    }

    $db->prepare("
        INSERT INTO support_tickets (user_id, subject, message, severity, priority)
        VALUES (?, ?, ?, 'open', ?)
    ")->execute([$auth['sub'], $input['subject'], $input['message'], $priority]);

    success(['id' => (int)$db->lastInsertId()], 'Ticket created', 201);
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
        error('Ticket not found', 404);
    }

    if (!$isAdmin && $ticket['user_id'] != $auth['sub']) {
        error('You do not have permission to modify this ticket', 403);
    }

    $updates = [];
    $params = [];

    if (isset($input['severity'])) {
        $errors = validate(['severity' => $input['severity']], ['severity' => 'in:open,in_progress,critical,resolved,closed']);
        if ($errors) {
            error('Validation error', 422, $errors);
        }
        $updates[] = "severity = ?";
        $params[] = $input['severity'];
    }

    if ($isAdmin) {
        if (isset($input['assigned_to'])) {
            $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$input['assigned_to']]);
            if (!$stmt->fetch()) {
                error('Assigned user not found', 404);
            }
            $updates[] = "assigned_to = ?";
            $params[] = $input['assigned_to'];
        }
        if (isset($input['admin_note'])) {
            $errors = validate(['admin_note' => $input['admin_note']], ['admin_note' => 'string|max:1000']);
            if ($errors) {
                error('Validation error', 422, $errors);
            }
            $updates[] = "admin_note = ?";
            $params[] = $input['admin_note'];
        }
    }

    if (empty($updates)) {
        error('No fields to update', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE support_tickets SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    success(null, 'Ticket updated');
}

// --- Admin Ticket Management ---

function adminListTickets(): void {
    requireRole('admin');
    listTickets();
}

function adminUpdateTicket(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        error('Ticket not found', 404);
    }

    $updates = [];
    $params = [];

    $statusValue = $input['status'] ?? $input['severity'] ?? null;
    if ($statusValue !== null) {
        $errors = validate(['status' => $statusValue], ['status' => 'in:open,in_progress,critical,resolved,closed']);
        if ($errors) {
            error('Validation error', 422, $errors);
        }
        $updates[] = "severity = ?";
        $params[] = $statusValue;
    }

    if (isset($input['assignedTo']) || isset($input['assigned_to'])) {
        $assignedTo = $input['assignedTo'] ?? $input['assigned_to'];
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$assignedTo]);
        if (!$stmt->fetch()) {
            error('Assigned user not found', 404);
        }
        $updates[] = "assigned_to = ?";
        $params[] = $assignedTo;
    }

    if (isset($input['adminNote']) || isset($input['admin_note'])) {
        $adminNote = $input['adminNote'] ?? $input['admin_note'];
        $errors = validate(['admin_note' => $adminNote], ['admin_note' => 'string|max:1000']);
        if ($errors) {
            error('Validation error', 422, $errors);
        }
        $updates[] = "admin_note = ?";
        $params[] = $adminNote;
    }

    if (empty($updates)) {
        error('No fields to update', 400);
    }

    $params[] = $id;
    $db->prepare("UPDATE support_tickets SET " . implode(', ', $updates) . " WHERE id = ?")
        ->execute($params);

    logAdminAction($auth['sub'], 'update_ticket', 'ticket', (int)$id, ['status' => $statusValue ?? null]);

    success(null, 'Ticket updated');
}

function adminReplyTicket(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $db = getDB();

    $rules = ['message' => 'required|string|min:1|max:10000'];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $stmt = $db->prepare("SELECT id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Ticket not found', 404);
    }

    $stmt = $db->prepare("
        INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin)
        VALUES (?, ?, ?, 1)
    ");
    $stmt->execute([$id, $auth['sub'], $input['message']]);

    $ticketStmt = $db->prepare("SELECT user_id FROM support_tickets WHERE id = ?");
    $ticketStmt->execute([$id]);
    $ticketOwnerId = $ticketStmt->fetchColumn();
    $db->prepare("INSERT INTO notifications (user_id, type, title, message, icon, link, created_at) VALUES (?, 'ticket', 'Reply to your ticket', ?, 'MessageCircle', '/client/dashboard', NOW())")->execute([$ticketOwnerId, 'An administrator has replied to your ticket #' . $id]);

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
    ], 'Reply added', 201);
}

function adminGetTicketReplies(string $id): void {
    requireRole('admin');
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        error('Ticket not found', 404);
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

/**
 * Lets the ticket owner (client or coach) reply to their own ticket.
 * QA-audit fix: ClientTickets/CoachTickets called POST /tickets/{id}/reply
 * which did not exist.
 */
function replyToTicket(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();

    $rules = ['message' => 'required|string|min:1|max:10000'];
    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $stmt = $db->prepare("SELECT user_id FROM support_tickets WHERE id = ?");
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        error('Ticket not found', 404);
    }
    if ((int)$ticket['user_id'] !== $auth['sub'] && $auth['role'] !== 'admin') {
        error('You do not have permission to reply to this ticket', 403);
    }

    $db->prepare("INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin)
        VALUES (?, ?, ?, 0)")
        ->execute([$id, $auth['sub'], $input['message']]);

    // Re-open the ticket so support staff sees there is a new reply.
    $db->prepare("UPDATE support_tickets SET severity = 'open', updated_at = NOW() WHERE id = ? AND severity = 'in_progress'")
        ->execute([$id]);

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
    ], 'Reply added', 201);
}
