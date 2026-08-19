CREATE TABLE IF NOT EXISTS platform_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    description VARCHAR(255) NULL,
    updated_by INT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_settings (setting_key, setting_value, description) VALUES
('platform_name', 'FitPower', 'Platform name'),
('support_email', 'support@fitpower.app', 'Support email'),
('default_language', 'en', 'Default language'),
('timezone', 'America/Mexico_City', 'Timezone'),
('max_users', '10000', 'Maximum allowed users'),
('max_storage_gb', '50', 'Maximum storage in GB'),
('api_rate_limit', '60', 'Requests per minute limit'),
('file_upload_max_mb', '25', 'Maximum file size in MB');
