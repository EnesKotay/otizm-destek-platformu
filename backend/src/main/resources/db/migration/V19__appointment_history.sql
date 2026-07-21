CREATE TABLE appointment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appt_history_appointment ON appointment_status_history(appointment_id);
CREATE INDEX idx_appt_history_changed_at ON appointment_status_history(changed_at);
