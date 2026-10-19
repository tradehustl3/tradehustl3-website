-- Run only after rolling back the application code that reads corrections_expire_at.
ALTER TABLE entitlements DROP COLUMN corrections_expire_at;
