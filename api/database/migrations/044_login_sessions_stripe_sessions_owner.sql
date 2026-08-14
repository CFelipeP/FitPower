-- login_sessions: device sessions tracking (limit 3 active per user)
CREATE TABLE IF NOT EXISTS login_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
    device_name VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    last_active DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_login_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_login_sessions_user (user_id),
    KEY idx_login_sessions_last_active (last_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stripe Connect account id (coach payouts). Stored on users (authoritative) and mirrored on trainers.
ALTER TABLE users ADD COLUMN stripe_account_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE trainers ADD COLUMN stripe_account_id VARCHAR(255) DEFAULT NULL;

-- Creator of a personal workout session (ownership for exercise management)
ALTER TABLE sessions ADD COLUMN user_id INT UNSIGNED NULL AFTER id;
ALTER TABLE sessions ADD KEY idx_sessions_user (user_id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
