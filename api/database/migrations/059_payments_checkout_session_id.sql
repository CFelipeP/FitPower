ALTER TABLE payments ADD COLUMN checkout_session_id VARCHAR(255) NULL AFTER method;
ALTER TABLE payments ADD KEY idx_payments_checkout_session (checkout_session_id);
