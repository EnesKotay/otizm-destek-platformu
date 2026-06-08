CREATE TABLE IF NOT EXISTS clinical_data_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_behavior_journal BOOLEAN DEFAULT FALSE,
    share_sensory_profile BOOLEAN DEFAULT FALSE,
    share_screening_results BOOLEAN DEFAULT FALSE,
    share_daily_tracker BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_data_shares_parent_id
    ON clinical_data_shares(parent_id);

CREATE INDEX IF NOT EXISTS idx_clinical_data_shares_child_id
    ON clinical_data_shares(child_id);

CREATE INDEX IF NOT EXISTS idx_clinical_data_shares_expert_id
    ON clinical_data_shares(expert_id);

CREATE INDEX IF NOT EXISTS idx_clinical_data_shares_active_lookup
    ON clinical_data_shares(child_id, expert_id, status);
