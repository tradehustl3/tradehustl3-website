-- Selectable resume template style: "plain" (ATS-safe) or "navy" (styled header band).
ALTER TABLE `resumes` ADD COLUMN `theme` text DEFAULT 'plain' NOT NULL;
