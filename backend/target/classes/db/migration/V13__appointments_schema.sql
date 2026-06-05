CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES users(id),
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INTEGER NOT NULL DEFAULT 50,
    type VARCHAR(30) NOT NULL DEFAULT 'FACE_TO_FACE',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    session_notes TEXT,
    cancellation_reason TEXT,
    meeting_link VARCHAR(500),
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    rating INTEGER,
    rating_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_expert_date ON appointments(expert_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_parent_date ON appointments(parent_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_child_date ON appointments(child_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TABLE IF NOT EXISTS expert_availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    CONSTRAINT uq_expert_availability_day UNIQUE (expert_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS expert_availability_blocked_slots (
    availability_id UUID NOT NULL REFERENCES expert_availabilities(id) ON DELETE CASCADE,
    slot_time VARCHAR(30) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expert_availability_expert ON expert_availabilities(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_availability_blocked ON expert_availability_blocked_slots(availability_id);
