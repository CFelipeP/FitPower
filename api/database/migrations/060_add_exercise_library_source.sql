-- ============================================================
-- 060 - Exercise library: source tracking for imported datasets
-- Adds provenance + dedup/idempotency support without touching
-- existing rows or relationships.
-- ============================================================
ALTER TABLE exercise_library
    ADD COLUMN source VARCHAR(64) NULL DEFAULT NULL COMMENT 'Dataset origin (e.g. github_exercises_dataset)' AFTER calories_burned,
    ADD COLUMN external_id VARCHAR(32) NULL DEFAULT NULL COMMENT 'Original record ID in the source dataset' AFTER source,
    ADD COLUMN source_url VARCHAR(255) NULL DEFAULT NULL COMMENT 'Provenance URL of the source dataset' AFTER external_id,
    ADD COLUMN secondary_muscles TEXT NULL COMMENT 'JSON array of secondary / synergist muscles' AFTER muscle_group,
    ADD COLUMN instructions_i18n MEDIUMTEXT NULL COMMENT 'JSON map of multilingual instructions (en, es, ...)' AFTER instructions,
    ADD COLUMN media_reference VARCHAR(500) NULL DEFAULT NULL COMMENT 'JSON: original media paths + attribution (media copyright applies)' AFTER instructions_i18n;

ALTER TABLE exercise_library ADD UNIQUE KEY uk_exercise_library_source_external (source, external_id);
