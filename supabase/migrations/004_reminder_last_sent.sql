-- Tracks when the most recent reminder was delivered to a user.
-- Used by /api/cron/check-reminders to dedup so we don't re-send within 23 hours
-- when the cron now ticks every minute.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;
