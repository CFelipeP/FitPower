ALTER TABLE notifications ADD COLUMN is_push_sent TINYINT(1) DEFAULT 0 AFTER link;
