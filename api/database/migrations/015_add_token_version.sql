ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL;

UPDATE users SET token_version = 0 WHERE token_version = 0;
