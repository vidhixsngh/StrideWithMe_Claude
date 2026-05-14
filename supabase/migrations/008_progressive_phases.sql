-- Progressive plan generation: only Foundation is created during onboarding for
-- 15/30-day sprints; Build/Peak/Finish phases are generated mid-sprint when the
-- user verifies their last day of the prior phase, using their accumulated logs
-- as context for a smarter, adaptive next phase.

ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS phase_themes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_generated_phase TEXT DEFAULT 'foundation';
