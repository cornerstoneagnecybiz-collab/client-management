-- Distinguish monthly/recurring engagements from one-time projects for clearer flows and reporting.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS engagement_type TEXT NOT NULL DEFAULT 'one_time'
  CHECK (engagement_type IN ('one_time', 'monthly'));

COMMENT ON COLUMN projects.engagement_type IS 'one_time: fixed-scope project; monthly: recurring retainer / monthly billing';
