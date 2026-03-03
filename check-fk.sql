-- Add FK name hint for bookings -> hosts join
-- Only needed if the team bookings API shows "Meeting" instead of host name
-- The API uses hosts!bookings_host_id_fkey which requires the FK to be named

-- Check existing FK name:
SELECT conname FROM pg_constraint
WHERE conrelid = 'bookings'::regclass AND confrelid = 'hosts'::regclass;
