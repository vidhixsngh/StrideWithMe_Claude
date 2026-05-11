CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  context TEXT DEFAULT 'profile',
  would_share BOOLEAN DEFAULT FALSE,
  allow_contact BOOLEAN DEFAULT FALSE,
  app_version TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON feedback;
CREATE POLICY "Users insert own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feedback" ON feedback;
CREATE POLICY "Users read own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);
