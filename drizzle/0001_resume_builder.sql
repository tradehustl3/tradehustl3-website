-- TRADE HUSTL3 Resume Builder backend foundation.
-- Local source migration only. Do not apply to production without approval.

CREATE TABLE IF NOT EXISTS `subscribers` (
  `email` text PRIMARY KEY NOT NULL,
  `interest` text NOT NULL,
  `source` text DEFAULT 'website' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `full_name` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `purpose` text DEFAULT 'login' NOT NULL,
  `expires_at` integer NOT NULL,
  `consumed_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `auth_tokens_user_idx` ON `auth_tokens` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `auth_tokens_expires_idx` ON `auth_tokens` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `revoked_at` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_user_idx` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_expires_idx` ON `sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resumes` (
  `resume_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `trade` text NOT NULL,
  `title` text NOT NULL,
  `intake_json` text NOT NULL,
  `generated_json` text,
  `target_job_posting` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `generated_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `deleted_at` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resumes_user_idx` ON `resumes` (`user_id`, `updated_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_orders` (
  `order_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `resume_id` text NOT NULL,
  `email` text NOT NULL,
  `plan` text NOT NULL,
  `amount_total` integer NOT NULL,
  `currency` text DEFAULT 'usd' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `stripe_session_id` text,
  `stripe_payment_intent_id` text,
  `paid_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `resume_orders_session_idx` ON `resume_orders` (`stripe_session_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_orders_user_idx` ON `resume_orders` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_orders_resume_idx` ON `resume_orders` (`resume_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_orders_email_idx` ON `resume_orders` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entitlements` (
  `entitlement_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `resume_id` text NOT NULL,
  `kind` text NOT NULL,
  `plan` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `credits_total` integer DEFAULT 0 NOT NULL,
  `credits_used` integer DEFAULT 0 NOT NULL,
  `access_expires_at` integer,
  `source_order_id` text,
  `stripe_subscription_id` text,
  `stripe_customer_id` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entitlements_user_idx` ON `entitlements` (`user_id`, `status`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `entitlements_source_order_idx` ON `entitlements` (`source_order_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `entitlements_subscription_idx` ON `entitlements` (`stripe_subscription_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_generations` (
  `generation_id` text PRIMARY KEY NOT NULL,
  `resume_id` text NOT NULL,
  `user_id` text NOT NULL,
  `mode` text DEFAULT 'generate' NOT NULL,
  `model` text NOT NULL,
  `input_tokens` integer DEFAULT 0 NOT NULL,
  `output_tokens` integer DEFAULT 0 NOT NULL,
  `guard_flags` text,
  `outcome` text DEFAULT 'ok' NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_generations_user_idx` ON `resume_generations` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_generations_resume_idx` ON `resume_generations` (`resume_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_files` (
  `file_id` text PRIMARY KEY NOT NULL,
  `resume_id` text NOT NULL,
  `user_id` text NOT NULL,
  `format` text NOT NULL,
  `object_key` text NOT NULL,
  `byte_size` integer NOT NULL,
  `sha256` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `resume_files_object_key_idx` ON `resume_files` (`object_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_files_resume_idx` ON `resume_files` (`resume_id`, `format`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stripe_events` (
  `event_id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `received_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `bucket` text PRIMARY KEY NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limits_window_idx` ON `rate_limits` (`window_start`);
