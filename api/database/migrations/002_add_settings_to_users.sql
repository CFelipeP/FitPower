-- Add settings JSON column to users table
ALTER TABLE users
    ADD COLUMN settings JSON DEFAULT NULL AFTER updated_at;
