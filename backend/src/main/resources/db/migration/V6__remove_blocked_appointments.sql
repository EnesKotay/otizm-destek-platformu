-- V6: BLOCKED randevuları expert_availability_blocked_slots tablosuna taşı
-- Tablo yoksa işlem güvenle atlanır

DO $$
BEGIN
    -- Sadece tüm ilgili tablolar varsa işlem yap
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expert_availabilities')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expert_availability_blocked_slots')
    THEN
        INSERT INTO expert_availability_blocked_slots (availability_id, slot_time)
        SELECT
            ea.id,
            a.appointment_date::text || '|' || to_char(a.appointment_time, 'HH24:MI')
        FROM appointments a
        JOIN expert_availabilities ea
            ON ea.expert_id = a.expert_id
            AND ea.day_of_week = EXTRACT(ISODOW FROM a.appointment_date)::int
        WHERE a.status = 'BLOCKED'
          AND NOT EXISTS (
              SELECT 1
              FROM expert_availability_blocked_slots existing
              WHERE existing.availability_id = ea.id
                AND existing.slot_time = a.appointment_date::text || '|' || to_char(a.appointment_time, 'HH24:MI')
          );

        DELETE FROM appointments WHERE status = 'BLOCKED';
    END IF;
END $$;
