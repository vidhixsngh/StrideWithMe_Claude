-- Add reminder fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reminder_time TIME,
  ADD COLUMN IF NOT EXISTS reminder_timezone TEXT,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;

-- Speed up the cron query
CREATE INDEX IF NOT EXISTS idx_profiles_reminder_enabled
  ON profiles(reminder_enabled)
  WHERE reminder_enabled = true;
