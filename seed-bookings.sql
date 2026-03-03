-- Seed realistic healthcare interview bookings
-- Run in Supabase SQL Editor

-- Get host and meeting type IDs
DO $$
DECLARE
  v_host_id UUID;
  v_rn_screen UUID;
  v_cna_interview UUID;
  v_panel UUID;
  v_clinical UUID;
BEGIN
  SELECT id INTO v_host_id FROM hosts WHERE email = 'charliefischer24@gmail.com';

  SELECT id INTO v_rn_screen FROM meeting_types WHERE host_id = v_host_id AND slug = 'rn-initial-phone-screen' LIMIT 1;
  SELECT id INTO v_cna_interview FROM meeting_types WHERE host_id = v_host_id AND slug = 'cna-interview' LIMIT 1;
  SELECT id INTO v_panel FROM meeting_types WHERE host_id = v_host_id AND slug = 'panel-interview-nursing-leadership' LIMIT 1;
  SELECT id INTO v_clinical FROM meeting_types WHERE host_id = v_host_id AND slug = 'clinical-skills-assessment' LIMIT 1;

  -- Clear old demo bookings
  DELETE FROM bookings WHERE host_id = v_host_id AND guest_email LIKE '%@example.com';

  -- Upcoming bookings (next 2 weeks)
  INSERT INTO bookings (host_id, meeting_type_id, guest_name, guest_email, starts_at, ends_at, status, timezone, google_meet_link) VALUES
  (v_host_id, v_rn_screen, 'Sarah Chen', 'sarah.chen@example.com',
    (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + TIME '09:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/abc-defg-hij'),

  (v_host_id, v_cna_interview, 'Marcus Johnson', 'marcus.j@example.com',
    (CURRENT_DATE + INTERVAL '1 day' + TIME '14:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + TIME '14:30')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/klm-nopq-rst'),

  (v_host_id, v_panel, 'Emily Rodriguez', 'e.rodriguez@example.com',
    (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '2 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/uvw-xyza-bcd'),

  (v_host_id, v_rn_screen, 'James Williams', 'j.williams@example.com',
    (CURRENT_DATE + INTERVAL '3 days' + TIME '11:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '3 days' + TIME '11:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/efg-hijk-lmn'),

  (v_host_id, v_clinical, 'Priya Patel', 'priya.p@example.com',
    (CURRENT_DATE + INTERVAL '3 days' + TIME '15:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '3 days' + TIME '15:45')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/opq-rstu-vwx'),

  (v_host_id, v_cna_interview, 'David Kim', 'david.kim@example.com',
    (CURRENT_DATE + INTERVAL '5 days' + TIME '09:30')::timestamptz,
    (CURRENT_DATE + INTERVAL '5 days' + TIME '10:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/yza-bcde-fgh'),

  (v_host_id, v_rn_screen, 'Lisa Thompson', 'lisa.t@example.com',
    (CURRENT_DATE + INTERVAL '5 days' + TIME '13:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '5 days' + TIME '13:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/ijk-lmno-pqr'),

  (v_host_id, v_panel, 'Robert Davis', 'r.davis@example.com',
    (CURRENT_DATE + INTERVAL '7 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '7 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/stu-vwxy-zab'),

  (v_host_id, v_cna_interview, 'Angela Martinez', 'a.martinez@example.com',
    (CURRENT_DATE + INTERVAL '8 days' + TIME '14:30')::timestamptz,
    (CURRENT_DATE + INTERVAL '8 days' + TIME '15:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/cde-fghi-jkl'),

  (v_host_id, v_clinical, 'Michael Brown', 'michael.b@example.com',
    (CURRENT_DATE + INTERVAL '10 days' + TIME '11:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '10 days' + TIME '11:45')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/mno-pqrs-tuv'),

  (v_host_id, v_rn_screen, 'Jennifer Lee', 'j.lee@example.com',
    (CURRENT_DATE + INTERVAL '12 days' + TIME '09:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '12 days' + TIME '09:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/wxy-zabc-def'),

  -- Past completed bookings
  (v_host_id, v_rn_screen, 'Amanda Foster', 'a.foster@example.com',
    (CURRENT_DATE - INTERVAL '2 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '2 days' + TIME '10:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/ghi-jklm-nop'),

  (v_host_id, v_cna_interview, 'Tyler Washington', 'tyler.w@example.com',
    (CURRENT_DATE - INTERVAL '3 days' + TIME '14:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '3 days' + TIME '14:30')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/qrs-tuvw-xyz'),

  (v_host_id, v_panel, 'Rachel Garcia', 'rachel.g@example.com',
    (CURRENT_DATE - INTERVAL '5 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '5 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/abc-defg-zzz'),

  -- One cancelled
  (v_host_id, v_rn_screen, 'Kevin Park', 'kevin.p@example.com',
    (CURRENT_DATE + INTERVAL '4 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '4 days' + TIME '10:15')::timestamptz,
    'cancelled', 'America/Denver', NULL);

END $$;

SELECT COUNT(*) AS bookings_seeded FROM bookings WHERE guest_email LIKE '%@example.com';
