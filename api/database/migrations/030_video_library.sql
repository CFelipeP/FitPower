CREATE TABLE IF NOT EXISTS video_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  category ENUM('exercise_demo','coach_feedback','coaching_session','educational') DEFAULT 'exercise_demo',
  exercise_id INT UNSIGNED NULL,
  coach_id INT UNSIGNED NULL,
  duration_seconds INT DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  mime_type VARCHAR(100),
  tags JSON,
  is_featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (exercise_id) REFERENCES exercise_library(id) ON DELETE SET NULL,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS video_feedback (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coach_id INT UNSIGNED NOT NULL,
  client_id INT UNSIGNED NOT NULL,
  workout_log_id INT UNSIGNED NULL,
  video_url VARCHAR(500) NOT NULL,
  notes TEXT,
  is_viewed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
