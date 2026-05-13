-- Original schema set goal_text and task_text with short varchar caps that real users
-- quickly hit. Switch to TEXT (no enforced length) — onboarding goals routinely run
-- 200-500 chars when users describe context properly, and the AI sometimes returns
-- task_text just over 80 chars too.

ALTER TABLE sprints ALTER COLUMN goal_text TYPE TEXT;
ALTER TABLE sprints ALTER COLUMN goal_category TYPE TEXT;
ALTER TABLE tasks   ALTER COLUMN task_text TYPE TEXT;
