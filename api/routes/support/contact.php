<?php

function submitContact(): void {
    $input = getJsonInput();

    // Spam protection: strict per-IP limit on the public form + honeypot.
    rateLimit(3);

    $honeypot = $input['website'] ?? '';
    if ($honeypot !== '') {
        // Bots fill hidden fields. Pretend success to avoid tipping them off.
        success(null, 'Message sent successfully', 201);
        return;
    }

    $rules = [
        'firstName' => 'required|string|min:1|max:100',
        'email' => 'required|email',
        'subject' => 'required|in:planes,tecnico,coach,otro',
        'message' => 'required|string|min:1|max:5000',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();

    // Duplicate detection: identical message from the same email within 10 minutes.
    $dupStmt = $db->prepare("
        SELECT 1 FROM contact_messages
        WHERE email = ? AND message = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        LIMIT 1
    ");
    $dupStmt->execute([$input['email'], $input['message']]);
    if ($dupStmt->fetchColumn()) {
        success(null, 'Message sent successfully', 201);
        return;
    }

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
            VALUES (?, 'contact', 'New contact message', ?, 'MessageCircle', '#f97316')
        ")->execute([
            $admin['id'],
            'From ' . $input['firstName'] . ': ' . mb_substr($input['message'], 0, 100),
        ]);

        try {
            if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
                require_once __DIR__ . '/../../helpers/mailer.php';
                $subject = 'New Contact Message from ' . htmlspecialchars($input['firstName'], ENT_QUOTES, 'UTF-8');
                $safeName = htmlspecialchars($input['firstName'], ENT_QUOTES, 'UTF-8');
                $safeEmail = htmlspecialchars($input['email'], ENT_QUOTES, 'UTF-8');
                $safeSubject = htmlspecialchars($input['subject'], ENT_QUOTES, 'UTF-8');
                $safeMessage = htmlspecialchars($input['message'], ENT_QUOTES, 'UTF-8');
                $html = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h2>New Contact Message</h2>
                    <p><strong>Name:</strong> {$safeName}</p>
                    <p><strong>Email:</strong> {$safeEmail}</p>
                    <p><strong>Subject:</strong> {$safeSubject}</p>
                    <p><strong>Message:</strong></p>
                    <blockquote style='border-left: 4px solid #FFD600; padding: 10px 20px; margin: 0;'>{$safeMessage}</blockquote>
                </div>";
                sendEmail($admin['email'], $subject, $html);
            }
        } catch (\Throwable $e) {}
    }

    success(null, 'Message sent successfully', 201);
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
    if (!$msg) error('Message not found', 404);
    // Mark as read
    $db->prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?")->execute([(int)$id]);
    success($msg);
}

function adminMarkMessageRead(string $id): void {
    requireRole('admin');
    $db = getDB();
    $db->prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?")->execute([(int)$id]);
    success(null, 'Marked as read');
}

function adminReplyMessage(string $id): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $message = trim((string)($input['message'] ?? ''));
    if ($message === '') error('Message required', 422);
    if (mb_strlen($message) > 10000) error('The message is too long (max. 10000 characters)', 422);
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM contact_messages WHERE id = ?");
    $stmt->execute([(int)$id]);
    $msg = $stmt->fetch();
    if (!$msg) error('Message not found', 404);
    $db->prepare("UPDATE contact_messages SET admin_reply = ?, replied_at = NOW(), replied_by = ? WHERE id = ?")
        ->execute([$message, $auth['sub'], (int)$id]);
    success(null, 'Reply sent');
}
