-- First-party Resume Builder funnel telemetry for Agent #1.
-- Behavioral events only. Payments remain authoritative in resume_orders.

CREATE TABLE IF NOT EXISTS funnel_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_name TEXT NOT NULL,
  anonymous_id TEXT,
  user_id TEXT,
  resume_id TEXT,
  session_id TEXT,
  path TEXT,
  metadata TEXT,
  occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS funnel_events_name_time_idx
  ON funnel_events (event_name, occurred_at);

CREATE INDEX IF NOT EXISTS funnel_events_resume_idx
  ON funnel_events (resume_id, occurred_at);

CREATE INDEX IF NOT EXISTS funnel_events_session_idx
  ON funnel_events (session_id, occurred_at);
