-- buddy_relationships was never created by a migration on fresh databases (it predates
-- Flyway adoption for this table and only ever existed via ad-hoc Hibernate ddl-auto).
-- Create it here, guarded by IF NOT EXISTS, so this migration is safe to (re)run both on
-- environments where the table already exists and on fresh ones.
CREATE TABLE IF NOT EXISTS buddy_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_mentor_relation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buddy_relationships_requester ON buddy_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_buddy_relationships_receiver ON buddy_relationships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_buddy_relationships_status ON buddy_relationships(status);

ALTER TABLE buddy_relationships
    ADD COLUMN IF NOT EXISTS request_message VARCHAR(600);
