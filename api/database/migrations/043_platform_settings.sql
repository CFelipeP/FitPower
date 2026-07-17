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
('platform_name', 'FitPower', 'Nombre de la plataforma'),
('support_email', 'support@fitpower.app', 'Email de soporte'),
('default_language', 'es', 'Idioma por defecto'),
('timezone', 'America/Mexico_City', 'Zona horaria'),
('max_users', '10000', 'Máximo de usuarios permitidos'),
('max_storage_gb', '50', 'Almacenamiento máximo en GB'),
('api_rate_limit', '60', 'Límite de peticiones por minuto'),
('file_upload_max_mb', '25', 'Tamaño máximo de archivo en MB');
