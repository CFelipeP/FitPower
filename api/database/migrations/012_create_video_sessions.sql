CREATE TABLE IF NOT EXISTS video_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    caller_id INT UNSIGNED NOT NULL,
    callee_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Video Session',
    scheduled_at DATETIME NULL,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    room_name VARCHAR(255) NULL,
    status ENUM('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_caller (caller_id),
    KEY idx_callee (callee_id),
    CONSTRAINT fk_video_sessions_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_video_sessions_callee FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE video_sessions ADD COLUMN scheduled_at DATETIME NULL AFTER title;

ALTER TABLE video_sessions ADD COLUMN started_at DATETIME NULL AFTER scheduled_at;

ALTER TABLE video_sessions ADD COLUMN ended_at DATETIME NULL AFTER started_at;

ALTER TABLE video_sessions ADD COLUMN room_name VARCHAR(255) NULL AFTER ended_at;

ALTER TABLE video_sessions MODIFY COLUMN status ENUM('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled';
