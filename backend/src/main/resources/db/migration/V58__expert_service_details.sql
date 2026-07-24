ALTER TABLE users
    ADD COLUMN IF NOT EXISTS session_fee_min numeric(10,2),
    ADD COLUMN IF NOT EXISTS session_fee_max numeric(10,2),
    ADD COLUMN IF NOT EXISTS offers_online boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS offers_face_to_face boolean NOT NULL DEFAULT true;
