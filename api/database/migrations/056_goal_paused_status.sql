ALTER TABLE client_goals MODIFY COLUMN status ENUM('active','completed','cancelled','paused') NOT NULL DEFAULT 'active';
