ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS appointment_topic varchar(250),
    ADD COLUMN IF NOT EXISTS pre_session_notes text;
