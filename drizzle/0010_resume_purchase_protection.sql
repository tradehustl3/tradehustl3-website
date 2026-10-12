-- Append-only purchase evidence. Do not backfill consent or delivery history.
CREATE TABLE IF NOT EXISTS resume_policy_acceptances (
  acceptance_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  order_id TEXT UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('intake', 'checkout')),
  policy_version TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  policy_snapshot_json TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS resume_policy_acceptances_intake_idx
  ON resume_policy_acceptances(user_id, resume_id, policy_version) WHERE source = 'intake';
CREATE INDEX IF NOT EXISTS resume_policy_acceptances_resume_idx
  ON resume_policy_acceptances(resume_id, accepted_at);

CREATE TABLE IF NOT EXISTS resume_file_deliveries (
  delivery_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'cover_pdf', 'cover_docx')),
  disposition TEXT NOT NULL CHECK (disposition IN ('inline', 'attachment')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  served_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS resume_file_deliveries_order_idx ON resume_file_deliveries(order_id, served_at);
CREATE INDEX IF NOT EXISTS resume_file_deliveries_resume_idx ON resume_file_deliveries(resume_id, served_at);

-- Signed disputes can precede the paid checkout event; keep their payment ID
-- so fulfillment cannot later reactivate a disputed purchase.
CREATE TABLE IF NOT EXISTS resume_dispute_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  dispute_id TEXT NOT NULL,
  payment_intent_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS resume_dispute_events_payment_idx ON resume_dispute_events(payment_intent_id);
