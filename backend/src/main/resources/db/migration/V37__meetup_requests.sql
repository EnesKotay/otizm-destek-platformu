CREATE TABLE IF NOT EXISTS meetup_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'YUZEYUZE',
    proposed_date DATE NOT NULL,
    proposed_time VARCHAR(5) NOT NULL,
    location VARCHAR(300),
    message VARCHAR(600),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetup_requests_requester ON meetup_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_meetup_requests_recipient ON meetup_requests(recipient_id);
