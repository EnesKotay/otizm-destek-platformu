-- Yerel kullanım videosu kayıtları için idempotent demo verisi.
-- Yalnızca *.otizm.local hesaplarını ve "Video Demo" başlıklı kayıtları etkiler.

DO $$
DECLARE
  demo_hash text;
  parent_user_id uuid;
  child_user_id uuid;
  expert_user_id uuid;
  pending_expert_id uuid;
  admin_user_id uuid;
  routine_user_id uuid;
  forum_post_id uuid;
BEGIN
  SELECT password_hash, id
    INTO demo_hash, parent_user_id
    FROM users
   WHERE email = 'video.demo@otizm.local';

  IF demo_hash IS NULL THEN
    RAISE EXCEPTION 'Önce video.demo@otizm.local ebeveyn demo hesabını oluşturun.';
  END IF;

  UPDATE users
     SET is_active = true,
         email_verified = true,
         onboarding_completed = true,
         updated_at = now()
   WHERE id = parent_user_id;

  -- İlk kurulum videosu her çalıştırmada aynı noktadan başlasın.
  DELETE FROM users WHERE email = 'video.onboarding@otizm.local';
  INSERT INTO users (
    email, password_hash, full_name, role, is_verified, email_verified,
    is_active, onboarding_completed, kvkk_consent, kvkk_consent_date, city
  ) VALUES (
    'video.onboarding@otizm.local', demo_hash, 'Demo Ailesi', 'PARENT', false, true,
    true, false, true, now(), 'İstanbul'
  );

  SELECT id INTO child_user_id
    FROM children
   WHERE parent_id = parent_user_id
   ORDER BY created_at
   LIMIT 1;

  IF child_user_id IS NULL THEN
    INSERT INTO children (parent_id, name, birth_date, diagnosis_info, education_program, therapies, gender)
    VALUES (parent_user_id, 'Deniz', '2019-04-12', 'Otizm spektrum bozukluğu', 'Kaynaştırma eğitimi', 'Dil terapisi, ergoterapi', 'KIZ')
    RETURNING id INTO child_user_id;
  ELSE
    UPDATE children
       SET diagnosis_info = COALESCE(diagnosis_info, 'Otizm spektrum bozukluğu'),
           education_program = COALESCE(education_program, 'Kaynaştırma eğitimi'),
           therapies = COALESCE(therapies, 'Dil terapisi, ergoterapi'),
           gender = COALESCE(gender, 'KIZ')
     WHERE id = child_user_id;
  END IF;

  INSERT INTO users (
    email, password_hash, full_name, role, is_verified, license_verified,
    email_verified, is_active, onboarding_completed, kvkk_consent,
    kvkk_consent_date, expert_title, institution, license_number, city,
    bio, specializations, accepting_patients
  ) VALUES (
    'video.expert@otizm.local', demo_hash, 'Uzm. Dr. Selin Kaya', 'EXPERT', true, true,
    true, true, true, true, now(), 'Çocuk ve Ergen Psikiyatristi',
    'Otizm Destek Eğitim Merkezi', 'VIDEO-EXP-001', 'İstanbul',
    'Gelişim takibi, aile danışmanlığı ve bireyselleştirilmiş eğitim planları üzerine çalışır.',
    '["Otizm Spektrum Bozukluğu", "Gelişim Takibi", "Aile Danışmanlığı"]'::jsonb, true
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = 'EXPERT',
    is_verified = true,
    license_verified = true,
    email_verified = true,
    is_active = true,
    onboarding_completed = true,
    kvkk_consent = true,
    expert_title = EXCLUDED.expert_title,
    institution = EXCLUDED.institution,
    license_number = EXCLUDED.license_number,
    city = EXCLUDED.city,
    bio = EXCLUDED.bio,
    specializations = EXCLUDED.specializations,
    accepting_patients = true,
    updated_at = now();

  SELECT id INTO expert_user_id FROM users WHERE email = 'video.expert@otizm.local';

  INSERT INTO users (
    email, password_hash, full_name, role, is_verified, license_verified,
    email_verified, is_active, onboarding_completed, kvkk_consent,
    kvkk_consent_date, expert_title, institution, license_number, city
  ) VALUES (
    'video.pending-expert@otizm.local', demo_hash, 'Psk. Mert Yılmaz', 'EXPERT', false, false,
    true, true, true, true, now(), 'Uzman Klinik Psikolog',
    'Yeni Yaşam Terapi Merkezi', 'VIDEO-PENDING-002', 'Ankara'
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'EXPERT',
    is_verified = false,
    license_verified = false,
    email_verified = true,
    is_active = true,
    onboarding_completed = true,
    expert_title = EXCLUDED.expert_title,
    institution = EXCLUDED.institution,
    license_number = EXCLUDED.license_number,
    city = EXCLUDED.city,
    updated_at = now();

  SELECT id INTO pending_expert_id FROM users WHERE email = 'video.pending-expert@otizm.local';

  UPDATE users
     SET password_hash = demo_hash,
         is_active = true,
         is_verified = true,
         email_verified = true,
         onboarding_completed = true,
         updated_at = now()
   WHERE email = 'admin@local.test'
   RETURNING id INTO admin_user_id;

  IF admin_user_id IS NULL THEN
    INSERT INTO users (
      email, password_hash, full_name, role, is_verified, email_verified,
      is_active, onboarding_completed, kvkk_consent, kvkk_consent_date
    ) VALUES (
      'admin@local.test', demo_hash, 'Platform Yöneticisi', 'ADMIN', true, true,
      true, true, true, now()
    ) RETURNING id INTO admin_user_id;
  END IF;

  INSERT INTO expert_patient_connections (id, expert_id, child_id, status)
  VALUES (gen_random_uuid(), expert_user_id, child_user_id, 'APPROVED')
  ON CONFLICT (expert_id, child_id) DO UPDATE SET status = 'APPROVED', updated_at = now();

  FOR day_number IN 1..5 LOOP
    INSERT INTO expert_availabilities (expert_id, day_of_week, enabled, start_time, end_time)
    VALUES (expert_user_id, day_number, true, '09:00', '17:00')
    ON CONFLICT (expert_id, day_of_week) DO UPDATE SET
      enabled = true, start_time = '09:00', end_time = '17:00';
  END LOOP;

  DELETE FROM appointments
   WHERE expert_id = expert_user_id AND appointment_topic LIKE 'Video Demo:%';

  INSERT INTO appointments (
    expert_id, parent_id, child_id, appointment_date, appointment_time,
    duration, type, status, notes, appointment_topic
  ) VALUES
    (expert_user_id, parent_user_id, child_user_id, current_date + 2, '14:30', 50, 'ONLINE', 'CONFIRMED', 'Gelişim hedefleri değerlendirilecek.', 'Video Demo: Gelişim değerlendirmesi'),
    (expert_user_id, parent_user_id, child_user_id, current_date + 7, '11:00', 50, 'FACE_TO_FACE', 'PENDING', 'Aile görüşmesi ve ev planı.', 'Video Demo: Aile görüşmesi');

  DELETE FROM expert_tasks
   WHERE expert_id = expert_user_id AND title LIKE 'Video Demo:%';

  INSERT INTO expert_tasks (
    expert_id, parent_id, child_id, title, description, category,
    difficulty, frequency, due_date, status
  ) VALUES
    (expert_user_id, parent_user_id, child_user_id, 'Video Demo: Sıra alma oyunu', 'Günde 10 dakika karşılıklı sıra alma oyunu oynayın.', 'İletişim', 'Kolay', 'Günlük', current_date + 5, 'PENDING'),
    (expert_user_id, parent_user_id, child_user_id, 'Video Demo: Görsel rutin çalışması', 'Sabah rutinindeki üç görsel kartı sırayla uygulayın.', 'Günlük Yaşam', 'Orta', 'Haftada 3', current_date + 10, 'PENDING');

  DELETE FROM patient_notes
   WHERE expert_id = expert_user_id AND content LIKE 'Video Demo:%';

  INSERT INTO patient_notes (expert_id, parent_id, child_id, content, category, note_date)
  VALUES
    (expert_user_id, parent_user_id, child_user_id, 'Video Demo: Deniz görsel yönergelerle geçişlerde daha rahat ilerliyor.', 'PROGRESS', current_date - 3),
    (expert_user_id, parent_user_id, child_user_id, 'Video Demo: Bir sonraki görüşmede sıra alma hedefi yeniden değerlendirilecek.', 'SESSION', current_date - 1);

  DELETE FROM mood_entries
   WHERE child_id = child_user_id AND entry_date BETWEEN current_date - 6 AND current_date;

  INSERT INTO mood_entries (child_id, entry_date, mood_level, notes, triggers)
  SELECT child_user_id,
         current_date - day_offset,
         (ARRAY[4, 3, 5, 4, 2, 4, 5])[day_offset + 1],
         'Video Demo: kısa günlük gözlem',
         CASE WHEN day_offset = 4 THEN '["Rutin Değişikliği"]'::jsonb ELSE '[]'::jsonb END
    FROM generate_series(0, 6) AS day_offset;

  DELETE FROM sleep_entries
   WHERE child_id = child_user_id AND sleep_date BETWEEN current_date - 6 AND current_date;

  INSERT INTO sleep_entries (
    child_id, sleep_date, bedtime, wake_time, duration_minutes, quality,
    night_wakings, notes
  )
  SELECT child_user_id,
         current_date - day_offset,
         '21:30', '07:00', 570,
         (ARRAY[4, 3, 5, 4, 3, 4, 5])[day_offset + 1],
         CASE WHEN day_offset IN (1, 4) THEN 1 ELSE 0 END,
         'Weighted:false|Sensory:false|Melatonin:false|Disturbance:false|Notes:Video Demo uyku kaydı'
    FROM generate_series(0, 6) AS day_offset;

  DELETE FROM medications
   WHERE child_id = child_user_id AND name = 'Omega-3 (Video Demo)';

  INSERT INTO medications (
    child_id, name, dosage, unit, frequency, scheduled_times, notes, is_active, start_date
  ) VALUES (
    child_user_id, 'Omega-3 (Video Demo)', '1', 'kapsül', 'DAILY', '["08:00"]'::jsonb,
    'Doktor önerisiyle kullanılan örnek video kaydıdır.', true, current_date - 30
  );

  SELECT id INTO routine_user_id
    FROM routines
   WHERE child_id = child_user_id AND name = 'Sabah Rutini (Video Demo)'
   LIMIT 1;

  IF routine_user_id IS NULL THEN
    routine_user_id := gen_random_uuid();
    INSERT INTO routines (id, created_at, updated_at, name, description, is_active, child_id)
    VALUES (routine_user_id, now(), now(), 'Sabah Rutini (Video Demo)', 'Güne sakin ve öngörülebilir başlamak için.', true, child_user_id);
  END IF;

  DELETE FROM routine_items WHERE routine_id = routine_user_id;
  INSERT INTO routine_items (id, created_at, updated_at, title, description, icon_name, scheduled_time, routine_id)
  VALUES
    (gen_random_uuid(), now(), now(), 'Yüzünü yıka', 'Banyodaki görsel kartı takip et.', 'Droplets', '07:30', routine_user_id),
    (gen_random_uuid(), now(), now(), 'Kahvaltını yap', 'Masadaki seçim kartlarından birini seç.', 'Utensils', '07:45', routine_user_id),
    (gen_random_uuid(), now(), now(), 'Çantanı kontrol et', 'Kontrol listesindeki üç öğeyi işaretle.', 'Backpack', '08:10', routine_user_id);

  IF NOT EXISTS (
    SELECT 1 FROM calendar_events WHERE child_id = child_user_id AND title = 'Dil Terapisi (Video Demo)'
  ) THEN
    INSERT INTO calendar_events (
      child_id, title, description, event_type, start_time, end_time,
      location, color, reminder_enabled
    ) VALUES (
      child_user_id, 'Dil Terapisi (Video Demo)', 'Haftalık dil ve iletişim çalışması', 'THERAPY',
      current_date + 3 + time '16:00', current_date + 3 + time '16:50',
      'Otizm Destek Eğitim Merkezi', '#4F46E5', true
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM development_notes WHERE child_id = child_user_id AND title = 'Yeni kelime kullanımı (Video Demo)'
  ) THEN
    INSERT INTO development_notes (child_id, title, content, category, mood, note_date)
    VALUES (
      child_user_id, 'Yeni kelime kullanımı (Video Demo)',
      'Deniz bugün isteğini iki kelimelik kısa bir cümleyle ifade etti.',
      'Dil Gelişimi', 'happy', current_date - 2
    );
  END IF;

  SELECT id INTO forum_post_id
    FROM forum_posts
   WHERE title = 'Görsel rutinleri nasıl kullanıyorsunuz? (Video Demo)'
   LIMIT 1;

  IF forum_post_id IS NULL THEN
    INSERT INTO forum_posts (
      author_id, title, content, category, post_type, like_count, comment_count
    ) VALUES (
      parent_user_id, 'Görsel rutinleri nasıl kullanıyorsunuz? (Video Demo)',
      'Sabah geçişlerini kolaylaştırmak için kullandığınız görsel kart önerilerini paylaşır mısınız?',
      'Günlük Yaşam', 'QUESTION', 8, 0
    ) RETURNING id INTO forum_post_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE name = 'İletişim Becerileri Destek Grubu (Video Demo)'
  ) THEN
    INSERT INTO groups (name, description, category, is_verified, created_by)
    VALUES (
      'İletişim Becerileri Destek Grubu (Video Demo)',
      'Ailelerin ve uzmanların iletişim çalışmaları üzerine deneyim paylaştığı demo grup.',
      'İletişim', true, expert_user_id
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM reports WHERE target_id = forum_post_id AND reason LIKE 'Video Demo:%'
  ) THEN
    INSERT INTO reports (id, created_at, reason, status, target_id, target_type, reporter_id)
    VALUES (
      gen_random_uuid(), now(), 'Video Demo: İçerik inceleme örneği', 'PENDING',
      forum_post_id, 'FORUM_POST', parent_user_id
    );
  END IF;
END $$;
