-- Tamamlanmış randevusu olan ama henüz ExpertPatientConnection kaydı bulunmayan
-- (expert, child) çiftleri için APPROVED bağlantı oluşturur.
-- Bu migration tek seferlik backfill işlemidir; ileriye dönük olarak
-- randevu tamamlandığında uygulama katmanı bağlantıyı oluşturur.
INSERT INTO expert_patient_connections (id, expert_id, child_id, status, created_at, updated_at)
SELECT
    gen_random_uuid(),
    a.expert_id,
    a.child_id,
    'APPROVED',
    NOW(),
    NOW()
FROM appointments a
WHERE a.status  = 'COMPLETED'
  AND a.child_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM expert_patient_connections ec
      WHERE ec.expert_id = a.expert_id
        AND ec.child_id  = a.child_id
  )
GROUP BY a.expert_id, a.child_id;
