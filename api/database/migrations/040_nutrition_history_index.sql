ALTER TABLE nutrition_logs ADD INDEX idx_user_date_history (user_id, log_date);
