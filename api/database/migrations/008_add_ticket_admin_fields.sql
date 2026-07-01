ALTER TABLE support_tickets
    ADD COLUMN assigned_to INT UNSIGNED NULL AFTER trainer_id,
    ADD COLUMN admin_note TEXT NULL AFTER message,
    ADD FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ticket_replies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB;
