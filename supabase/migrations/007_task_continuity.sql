-- New AI plan structure: each task carries forward established habits and explains why it matters.
-- ongoing_habits = array of strings ("Continue logging meals", "Stay in 500-cal deficit")
-- rationale     = single short paragraph explaining why this task today

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS ongoing_habits TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rationale TEXT;
