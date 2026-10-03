ALTER TABLE resumes ADD COLUMN generation_track TEXT CHECK (generation_track IN ('plain', 'navy', 'lead'));
UPDATE resumes SET generation_track = theme;
