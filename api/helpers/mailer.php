<?php
require __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendEmail(string $to, string $subject, string $htmlBody, string $textBody = ''): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $textBody ?: strip_tags($htmlBody);

        return $mail->send();
    } catch (Exception $e) {
        error_log("Mail error: " . $e->getMessage());
        return false;
    }
}

function sendPasswordResetEmail(string $email, string $token): bool {
    $resetLink = APP_URL . '/login?reset_token=' . $token;
    $subject = 'FitPower - Password Reset Request';
    $html = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #FFD600; margin: 0;'>⚡ FitPower</h1>
        </div>
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password. Click the button below to set a new one:</p>
        <div style='text-align: center; padding: 20px;'>
            <a href='$resetLink' style='background: #FFD600; color: #000; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link expires in 1 hour.</p>
        <hr style='border: none; border-top: 1px solid #eee;' />
        <p style='color: #888; font-size: 12px;'>FitPower — Train Without Limits</p>
    </div>";
    return sendEmail($email, $subject, $html);
}

function sendWelcomeEmail(string $email, string $firstName): bool {
    $subject = 'Welcome to FitPower!';
    $html = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #FFD600; margin: 0;'>⚡ FitPower</h1>
        </div>
        <h2>Welcome, $firstName! 🎉</h2>
        <p>Your journey to a better you starts now. Here's what to do next:</p>
        <ol>
            <li><strong>Complete your profile</strong> — Set your fitness goals</li>
            <li><strong>Try your first workout</strong> — AI-personalized just for you</li>
            <li><strong>Join the community</strong> — Connect with other athletes</li>
        </ol>
        <div style='text-align: center; padding: 20px;'>
            <a href='" . APP_URL . "/client/dashboard' style='background: #FFD600; color: #000; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Go to Dashboard</a>
        </div>
        <hr style='border: none; border-top: 1px solid #eee;' />
        <p style='color: #888; font-size: 12px;'>FitPower — Train Without Limits</p>
    </div>";
    return sendEmail($email, $subject, $html);
}

function sendNotificationEmail(string $email, string $firstName, string $title, string $message, string $link = ''): bool {
    $subject = $title;
    $html = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #FFD600; margin: 0;'>⚡ FitPower</h1>
        </div>
        <h2>Hi $firstName!</h2>
        <p>$message</p>
        " . ($link ? "<div style='text-align: center; padding: 20px;'><a href='$link' style='background: #FFD600; color: #000; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>View Details</a></div>" : "") . "
        <hr style='border: none; border-top: 1px solid #eee;' />
        <p style='color: #888; font-size: 12px;'>FitPower — Train Without Limits</p>
    </div>";
    return sendEmail($email, $subject, $html);
}
