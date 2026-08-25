-- Rollback for the Resume Builder tables only.
-- This destroys Resume Builder data. Export before any authorized rollback.

DROP TABLE IF EXISTS `rate_limits`;
--> statement-breakpoint
DROP TABLE IF EXISTS `stripe_events`;
--> statement-breakpoint
DROP TABLE IF EXISTS `resume_files`;
--> statement-breakpoint
DROP TABLE IF EXISTS `resume_generations`;
--> statement-breakpoint
DROP TABLE IF EXISTS `entitlements`;
--> statement-breakpoint
DROP TABLE IF EXISTS `resume_orders`;
--> statement-breakpoint
DROP TABLE IF EXISTS `resumes`;
--> statement-breakpoint
DROP TABLE IF EXISTS `sessions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `auth_tokens`;
--> statement-breakpoint
DROP TABLE IF EXISTS `users`;
