ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_visible_to_experts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS share_progress_with_experts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '["notif_messages","notif_forum","notif_matching","notif_calendar","notif_appointment_request","notif_patient_connection","notif_expert_note","notif_task_assigned","notif_appt_confirm"]'::jsonb,
    ADD COLUMN IF NOT EXISTS appointment_reminder_24h BOOLEAN NOT NULL DEFAULT TRUE;
