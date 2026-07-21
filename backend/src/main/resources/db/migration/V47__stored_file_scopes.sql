ALTER TABLE stored_files ADD COLUMN IF NOT EXISTS scope_type VARCHAR(30);
ALTER TABLE stored_files ADD COLUMN IF NOT EXISTS scope_id UUID;
CREATE INDEX IF NOT EXISTS idx_stored_files_scope ON stored_files(scope_type, scope_id);
