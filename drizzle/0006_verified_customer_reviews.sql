CREATE TABLE IF NOT EXISTS review_requests (
  request_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE,
  scheduled_at INTEGER NOT NULL,
  sent_at TEXT,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS review_requests_due_idx
  ON review_requests (sent_at, consumed_at, scheduled_at);

CREATE INDEX IF NOT EXISTS review_requests_user_idx
  ON review_requests (user_id, created_at);

CREATE TABLE IF NOT EXISTS customer_reviews (
  review_id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL,
  public_name TEXT NOT NULL,
  trade TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  result_text TEXT,
  recommend INTEGER NOT NULL DEFAULT 0 CHECK (recommend IN (0, 1)),
  consent_publish INTEGER NOT NULL DEFAULT 0 CHECK (consent_publish IN (0, 1)),
  consent_resume_example INTEGER NOT NULL DEFAULT 0 CHECK (consent_resume_example IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS customer_reviews_public_idx
  ON customer_reviews (status, consent_publish, approved_at);

CREATE INDEX IF NOT EXISTS customer_reviews_user_idx
  ON customer_reviews (user_id, created_at);
