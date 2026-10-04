-- Run only after rolling back application code and restoring version-1 file pointers.
ALTER TABLE resumes DROP COLUMN template_version;
ALTER TABLE resumes DROP COLUMN accent;
ALTER TABLE resumes DROP COLUMN spacing;
ALTER TABLE resumes DROP COLUMN text_size;
ALTER TABLE resumes DROP COLUMN font;
