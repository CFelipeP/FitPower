ALTER TABLE user_subscriptions MODIFY COLUMN status ENUM('active','cancelled','expired','payment_failed','pending_cancel','suspended') NOT NULL DEFAULT 'active';
ALTER TABLE user_subscriptions ADD COLUMN cancellation_reason VARCHAR(255) NULL AFTER cancelled_at;
ALTER TABLE user_subscriptions ADD COLUMN last_payment_failed_at DATETIME NULL AFTER cancellation_reason;
ALTER TABLE user_subscriptions ADD COLUMN dunning_stage TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER last_payment_failed_at;
ALTER TABLE payments ADD COLUMN stripe_invoice_id VARCHAR(255) NULL AFTER status;
