CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_read_receipts_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id
    ON message_read_receipts(user_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id
    ON message_read_receipts(message_id);
