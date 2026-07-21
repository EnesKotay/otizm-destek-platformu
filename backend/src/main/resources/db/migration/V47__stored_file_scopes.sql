ALTER TABLE stored_files ADD COLUMN scope_type VARCHAR(30);
ALTER TABLE stored_files ADD COLUMN scope_id UUID;
CREATE INDEX idx_stored_files_scope ON stored_files(scope_type, scope_id);
