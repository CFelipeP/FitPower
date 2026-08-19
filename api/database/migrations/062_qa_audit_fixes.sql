-- ============================================================
-- 062 - Missing tables/columns found by QA audit
--  1. client_notes        (coach client notes panel -> 500)
--  2. session_progress    (guided workout progress -> 404)
--  3. workout_logs.total_volume / created_at (strength 500s)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_notes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id INT UNSIGNED NOT NULL,
    client_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NULL,
    category ENUM('general','nutrition','training','progress','health') NOT NULL DEFAULT 'general',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_coach_client (coach_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    progress JSON NULL COMMENT 'Guided workout progress snapshot',
    completed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_session_user (session_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE workout_logs ADD COLUMN total_volume DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'sets * weight (volume) for the log' AFTER weight_used;
ALTER TABLE workout_logs ADD COLUMN created_at DATETIME NULL DEFAULT NULL COMMENT 'Mirror of logged_at for compatibility' AFTER logged_at;
UPDATE workout_logs SET created_at = logged_at WHERE created_at IS NULL;
