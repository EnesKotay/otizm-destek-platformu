ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS session_summary text,
    ADD COLUMN IF NOT EXISTS follow_up_recommendations text,
    ADD COLUMN IF NOT EXISTS follow_up_task text;
