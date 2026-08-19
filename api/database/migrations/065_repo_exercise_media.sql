-- ============================================================
-- 065 - Repo media for exercises (100% repository videos/demos)
-- Backfills image_url (thumbnail) and video_url (animation GIF)
-- for the github_exercises_dataset exercises from media_reference.
-- Media © Gym visual — attribution kept in media_reference.
-- ============================================================
UPDATE exercise_library
SET image_url = CONCAT('https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/', JSON_UNQUOTE(JSON_EXTRACT(media_reference, '$.image'))),
    video_url = CONCAT('https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/', JSON_UNQUOTE(JSON_EXTRACT(media_reference, '$.gif_url')))
WHERE source = 'github_exercises_dataset'
  AND media_reference IS NOT NULL
  AND JSON_VALID(media_reference)
  AND JSON_EXTRACT(media_reference, '$.gif_url') IS NOT NULL
  AND JSON_EXTRACT(media_reference, '$.gif_url') IS NOT NULL;
