-- Schools & programs inquiries from tradehustl3.com/book (#schools).
-- worker/book-program-inquiry.ts runs the same idempotent CREATE statements,
-- so the form works even if the Worker deploys before this migration runs.
CREATE TABLE IF NOT EXISTS book_program_inquiries (
  inquiry_id TEXT PRIMARY KEY NOT NULL,
  organization TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  program_type TEXT NOT NULL,
  format TEXT NOT NULL,
  copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 10000),
  needed_by TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS book_program_inquiries_created_idx
  ON book_program_inquiries (created_at);

CREATE INDEX IF NOT EXISTS book_program_inquiries_email_idx
  ON book_program_inquiries (email, created_at);
