<?php

function adminSecurityMetrics(): void {
    requireRole('admin');
    $db = getDB();

    // Count active sessions (users logged in within last 24h)
    $activeSessions = (int)$db->query("
        SELECT COUNT(*) FROM users
        WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND status = 'active'
    ")->fetchColumn();

    // Count blocked login attempts in last 7 days
    $blockedAttempts = (int)$db->query("
        SELECT COUNT(*) FROM login_throttle
        WHERE locked_until IS NOT NULL
        AND locked_until >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ")->fetchColumn();

    // Count warnings - suspicious activities in last 30 days
    $warnings = (int)$db->query("
        SELECT COUNT(*) FROM admin_audit_log
        WHERE action IN ('suspicious_login', 'failed_access', 'permission_denied')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ")->fetchColumn();

    // Count total admins
    $adminCount = (int)$db->query("
        SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'
    ")->fetchColumn();

    // Get recent audit log entries
    $auditStmt = $db->query("
        SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as admin_name
        FROM admin_audit_log al
        JOIN users u ON u.id = al.admin_id
        ORDER BY al.created_at DESC
        LIMIT 10
    ");
    $recentActivity = [];
    foreach ($auditStmt as $a) {
        $recentActivity[] = [
            'text' => $a['admin_name'] . ' ' . str_replace('_', ' ', $a['action']) . ' ' . $a['target_type'] . ' #' . $a['target_id'],
            'sub' => $a['action'],
            'time' => $a['created_at'],
        ];
    }

    // Security score (simple calculation)
    $totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $verifiedUsers = (int)$db->query("SELECT COUNT(*) FROM users WHERE email_verified_at IS NOT NULL")->fetchColumn();
    $verifyRate = $totalUsers > 0 ? round($verifiedUsers / $totalUsers * 100) : 100;

    $score = 'A+';
    if ($verifyRate < 50 || $blockedAttempts > 100) $score = 'B';
    if ($verifyRate < 30 || $blockedAttempts > 500) $score = 'C';
    if ($blockedAttempts > 1000) $score = 'D';

    success([
        'score' => $score,
        'activeSessions' => $activeSessions,
        'warnings' => $warnings,
        'blockedAttempts' => $blockedAttempts,
        'adminCount' => $adminCount,
        'recentActivity' => $recentActivity,
        'verifyRate' => $verifyRate . '%',
    ]);
}
