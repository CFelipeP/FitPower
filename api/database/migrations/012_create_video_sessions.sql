ALTER TABLE video_sessions ADD COLUMN scheduled_at DATETIME NULL AFTER title;

ALTER TABLE video_sessions ADD COLUMN started_at DATETIME NULL AFTER scheduled_at;

ALTER TABLE video_sessions ADD COLUMN ended_at DATETIME NULL AFTER started_at;

ALTER TABLE video_sessions ADD COLUMN room_name VARCHAR(255) NULL AFTER ended_at;

ALTER TABLE video_sessions MODIFY COLUMN status ENUM('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled';
