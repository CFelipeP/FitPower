ALTER TABLE support_tickets
    ADD COLUMN category ENUM('billing','technical','coach','account','other') NOT NULL DEFAULT 'other' AFTER message,
    ADD COLUMN priority TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER category;
