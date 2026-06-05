DO $$
BEGIN
    IF to_regclass('public.conversations') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
            ON conversations(last_message_at DESC NULLS LAST);
    END IF;

    IF to_regclass('public.notifications') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
            ON notifications(user_id, read, created_at DESC);
    END IF;

    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
            ON audit_logs(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
            ON audit_logs(action, created_at DESC);
    END IF;

    IF to_regclass('public.appointments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_expert_status_date
            ON appointments(expert_id, status, appointment_date, appointment_time);

        CREATE INDEX IF NOT EXISTS idx_appointments_parent_status_date
            ON appointments(parent_id, status, appointment_date, appointment_time);
    END IF;
END $$;
