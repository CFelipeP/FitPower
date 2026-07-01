<?php

function verifyEmail(): void {
    $input = getJsonInput();

    $errors = validate($input, ['token' => 'required|string']);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, email FROM users WHERE remember_token = ? AND email_verified_at IS NULL");
    $stmt->execute([$input['token']]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Token inválido o ya verificado', 400);
    }

    $db->prepare("UPDATE users SET email_verified_at = NOW(), remember_token = NULL WHERE id = ?")
        ->execute([$user['id']]);

    success(null, 'Email verificado exitosamente');
}

function resendVerification(): void {
    $input = getJsonInput();

    $errors = validate($input, ['email' => 'required|email']);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, first_name, email_verified_at FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        success(null, 'Si el email existe, recibirás un nuevo enlace de verificación');
        return;
    }

    if ($user['email_verified_at']) {
        error('El email ya fue verificado', 400);
    }

    $token = bin2hex(random_bytes(32));
    $db->prepare("UPDATE users SET remember_token = ? WHERE id = ?")
        ->execute([$token, $user['id']]);

    try {
        if (file_exists(__DIR__ . '/../../helpers/mailer.php')) {
            require_once __DIR__ . '/../../helpers/mailer.php';
            $verifyLink = APP_URL . '/login?verify_token=' . $token;
            $subject = 'FitPower - Verify Your Email';
            $html = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #FFD600; margin: 0;'>⚡ FitPower</h1>
        </div>
        <h2>Verify Your Email</h2>
        <p>Hi {$user['first_name']}, thanks for signing up! Please verify your email by clicking the button below:</p>
        <div style='text-align: center; padding: 20px;'>
            <a href='$verifyLink' style='background: #FFD600; color: #000; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Verify Email</a>
        </div>
        <p>If you didn't create a FitPower account, you can safely ignore this email.</p>
        <hr style='border: none; border-top: 1px solid #eee;' />
        <p style='color: #888; font-size: 12px;'>FitPower — Train Without Limits</p>
    </div>";
            sendEmail($user['email'], $subject, $html);
        }
    } catch (\Throwable $e) {}

    success(null, 'Email de verificación reenviado');
}
