CREATE TABLE IF NOT EXISTS workout_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_id INT UNSIGNED NULL,
    exercise_id INT UNSIGNED NULL,
    sets_completed INT UNSIGNED NOT NULL DEFAULT 0,
    reps_completed VARCHAR(100) NULL,
    weight_used VARCHAR(50) NULL,
    notes TEXT NULL,
    logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wlog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wlog_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_wlog_exercise FOREIGN KEY (exercise_id) REFERENCES exercise_library(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
