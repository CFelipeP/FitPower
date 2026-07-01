<?php

function submitContact(): void {
    $input = getJsonInput();

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'subject' => 'required|in:planes,tecnico,coach,otro',
        'message' => 'required|string|min:1|max:5000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();

    $db->prepare("
        INSERT INTO contact_messages (first_name, email, subject, message)
        VALUES (?, ?, ?, ?)
    ")->execute([
        $input['firstName'],
        $input['email'],
        $input['subject'],
        $input['message'],
    ]);

    $adminStmt = $db->query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
    $admin = $adminStmt->fetch();
    if ($admin) {
        $db->prepare("
            INSERT INTO notifications (user_id, type, title, message, icon, icon_color)
            VALUES (?, 'contact', 'Nuevo mensaje de contacto', ?, 'MessageCircle', '#f97316')
        ")->execute([
            $admin['id'],
            'De ' . $input['firstName'] . ': ' . mb_substr($input['message'], 0, 100),
        ]);

        try {
            if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
                require_once __DIR__ . '/../../helpers/mailer.php';
                $subject = 'New Contact Message from ' . $input['firstName'];
                $html = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h2>New Contact Message</h2>
                    <p><strong>Name:</strong> {$input['firstName']}</p>
                    <p><strong>Email:</strong> {$input['email']}</p>
                    <p><strong>Subject:</strong> {$input['subject']}</p>
                    <p><strong>Message:</strong></p>
                    <blockquote style='border-left: 4px solid #FFD600; padding: 10px 20px; margin: 0;'>{$input['message']}</blockquote>
                </div>";
                sendEmail($admin['email'], $subject, $html);
            }
        } catch (\Throwable $e) {}
    }

    success(null, 'Mensaje enviado correctamente', 201);
}

function adminListMessages(): void {
    requireRole('admin');
    $db = getDB();
    $stmt = $db->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
    success($stmt->fetchAll());
}

function adminGetMessage(string $id): void {
    requireRole('admin');
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM contact_messages WHERE id = ?");
    $stmt->execute([(int)$id]);
    $msg = $stmt->fetch();
    if (!$msg) error('Mensaje no encontrado', 404);
    // Mark as read
    $db->prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?")->execute([(int)$id]);
    success($msg);
}

function adminMarkMessageRead(string $id): void {
    requireRole('admin');
    $db = getDB();
    $db->prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?")->execute([(int)$id]);
    success(null, 'Marcado como leído');
}

function adminReplyMessage(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $message = $input['message'] ?? '';
    if (!trim($message)) error('Mensaje requerido', 422);
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM contact_messages WHERE id = ?");
    $stmt->execute([(int)$id]);
    $msg = $stmt->fetch();
    if (!$msg) error('Mensaje no encontrado', 404);
    $db->prepare("UPDATE contact_messages SET admin_reply = ?, replied_at = NOW(), replied_by = ? WHERE id = ?")
        ->execute([$message, $auth['sub'], (int)$id]);
    success(null, 'Respuesta enviada');
}
