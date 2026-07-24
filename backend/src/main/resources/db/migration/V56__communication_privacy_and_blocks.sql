ALTER TABLE users
    ADD COLUMN IF NOT EXISTS allow_direct_messages boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_family_messages boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS hide_online_status boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approximate_location_only boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS communication_preferences jsonb NOT NULL DEFAULT '["YAZISMA"]'::jsonb,
    ADD COLUMN IF NOT EXISTS support_intents jsonb NOT NULL DEFAULT '["DENEYIM_PAYLASIMI"]'::jsonb;

CREATE TABLE IF NOT EXISTS user_blocks (
    id uuid PRIMARY KEY,
    blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_blocks UNIQUE (blocker_id, blocked_id),
    CONSTRAINT ck_user_blocks_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
