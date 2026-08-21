-- Payment must require an explicit card payment action in sandbox/demo mode.
ALTER TABLE payments
  ADD COLUMN card_submitted TINYINT NOT NULL DEFAULT 0 AFTER checkout_session_id;
