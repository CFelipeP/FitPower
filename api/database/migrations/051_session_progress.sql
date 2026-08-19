ALTER TABLE sessions MODIFY COLUMN status ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled';
ALTER TABLE sessions ADD COLUMN progress JSON NULL AFTER status;
ALTER TABLE sessions ADD COLUMN started_at DATETIME NULL AFTER progress;
ALTER TABLE sessions ADD COLUMN completed_at DATETIME NULL AFTER started_at;
