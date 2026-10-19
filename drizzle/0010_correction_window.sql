-- Additive migration. Export a D1 restore point before production application.
-- Unix seconds after which a paid package can no longer reserve a correction run.
-- Separate from access_expires_at, which gates downloads, status and checkout.
-- Existing rows stay NULL (no deadline); production had 0 active entitlements on 2026-10-19.
ALTER TABLE entitlements ADD COLUMN corrections_expire_at INTEGER;
