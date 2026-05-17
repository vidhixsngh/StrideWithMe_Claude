-- Track whether the user has already used the once-per-sprint plan regeneration.
-- Once true, the dashboard's "rebuild this phase" banner is suppressed for the rest of the sprint.

ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS has_replanned BOOLEAN NOT NULL DEFAULT FALSE;
