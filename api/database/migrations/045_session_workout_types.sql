-- Allow client workout-log session types in addition to scheduled coaching sessions
ALTER TABLE sessions MODIFY COLUMN type ENUM('group','1on1','video','strength','hypertrophy','cardio','hiit','flexibility') NOT NULL DEFAULT 'group';
