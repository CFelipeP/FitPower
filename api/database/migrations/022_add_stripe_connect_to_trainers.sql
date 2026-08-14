ALTER TABLE trainers ADD COLUMN stripe_connect_account_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE trainers ADD COLUMN stripe_connect_onboarding_complete TINYINT(1) DEFAULT 0;
ALTER TABLE trainers ADD COLUMN stripe_connect_onboarding_url VARCHAR(500) DEFAULT NULL;
