ALTER TABLE notifications ADD COLUMN is_push_sent TINYINT(1) DEFAULT 0;

CREATE TABLE content_reports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT UNSIGNED NOT NULL,
    content_type ENUM('forum_topic','forum_reply','social_post','social_comment','challenge'),
    content_id INT UNSIGNED NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending','reviewed','dismissed','action_taken') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
