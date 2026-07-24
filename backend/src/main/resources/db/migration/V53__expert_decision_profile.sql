ALTER TABLE users
    ADD COLUMN IF NOT EXISTS age_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS support_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS spoken_languages jsonb NOT NULL DEFAULT '["Türkçe"]'::jsonb,
    ADD COLUMN IF NOT EXISTS session_duration_minutes integer NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS cancellation_policy text,
    ADD COLUMN IF NOT EXISTS reschedule_policy text;
