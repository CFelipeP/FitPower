-- Virtual Wallet payments: provider + provider intent id (idempotency key)
ALTER TABLE payments
  ADD COLUMN provider VARCHAR(30) NULL AFTER method,
  ADD COLUMN provider_intent_id VARCHAR(100) NULL AFTER provider,
  ADD COLUMN coupon_code VARCHAR(50) NULL AFTER provider_intent_id,
  ADD COLUMN plan_id INT NULL AFTER coupon_code,
  ADD COLUMN billing VARCHAR(10) NULL AFTER plan_id,
  ADD UNIQUE KEY idx_payments_provider_intent (provider_intent_id);
