ALTER TABLE exercise_library ADD COLUMN calories_burned DECIMAL(6,2) DEFAULT NULL COMMENT 'Estimated calories burned per set';
ALTER TABLE workout_logs ADD COLUMN calories_burned INT UNSIGNED DEFAULT NULL COMMENT 'Total calories burned for this log entry';
