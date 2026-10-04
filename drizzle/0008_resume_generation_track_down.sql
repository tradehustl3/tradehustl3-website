-- Revert application code first. Existing theme and generated content remain intact.
ALTER TABLE resumes DROP COLUMN generation_track;
