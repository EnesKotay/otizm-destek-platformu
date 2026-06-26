ALTER TABLE buddy_relationships
    ADD COLUMN IF NOT EXISTS request_message VARCHAR(600);
