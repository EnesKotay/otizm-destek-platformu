-- Messaging schema fixes that were previously left to Hibernate ddl-auto update.

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS title VARCHAR(255);

CREATE TABLE IF NOT EXISTS conversation_muted_by (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversation_archived_by (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_muted_by_user
    ON conversation_muted_by(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_archived_by_user
    ON conversation_archived_by(user_id);

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

ALTER TABLE messages
    ALTER COLUMN message_type TYPE VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
    ON messages(reply_to_id);

CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_message_reactions_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
    ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
    ON message_reactions(user_id);

CREATE TABLE IF NOT EXISTS conversation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_conversation_settings_conversation_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_user
    ON conversation_settings(user_id);
