CREATE TABLE IF NOT EXISTS stored_files (
    filename VARCHAR(255) PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(512),
    content_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stored_files_owner ON stored_files(owner_id);
