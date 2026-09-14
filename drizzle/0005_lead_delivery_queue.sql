CREATE TABLE IF NOT EXISTS lead_delivery_jobs (
  job_id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS lead_delivery_jobs_due_idx
  ON lead_delivery_jobs (status, next_attempt_at);
