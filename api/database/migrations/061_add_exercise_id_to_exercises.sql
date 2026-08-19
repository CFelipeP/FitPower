-- ============================================================
-- 061 - Optional link from session exercises to the catalog
-- Lets coaches pick exercises from exercise_library (now 1,341)
-- while keeping free-text names intact. Non-destructive: nullable,
-- ON DELETE SET NULL.
-- ============================================================
ALTER TABLE exercises ADD COLUMN exercise_id INT UNSIGNED NULL DEFAULT NULL COMMENT 'Optional link to exercise_library catalog' AFTER sort_order;
ALTER TABLE exercises ADD CONSTRAINT fk_exercises_exercise_library FOREIGN KEY (exercise_id) REFERENCES exercise_library(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD INDEX idx_exercises_exercise_id (exercise_id);
