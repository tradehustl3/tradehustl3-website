-- Additive migration. Export a D1 restore point before production application.
ALTER TABLE resumes ADD COLUMN font TEXT NOT NULL DEFAULT 'Classic' CHECK (font IN ('Classic', 'Modern', 'Traditional'));
ALTER TABLE resumes ADD COLUMN text_size TEXT NOT NULL DEFAULT 'Standard' CHECK (text_size IN ('Small', 'Standard', 'Large'));
ALTER TABLE resumes ADD COLUMN spacing TEXT NOT NULL DEFAULT 'Standard' CHECK (spacing IN ('Compact', 'Standard', 'Spacious'));
ALTER TABLE resumes ADD COLUMN accent TEXT NOT NULL DEFAULT 'Black' CHECK (accent IN ('Red', 'Navy', 'Charcoal', 'Forest Green', 'Burgundy', 'Black'));
ALTER TABLE resumes ADD COLUMN template_version INTEGER NOT NULL DEFAULT 1 CHECK (template_version IN (1, 2));
