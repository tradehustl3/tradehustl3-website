CREATE TABLE `resume_orders` (
  `order_id` text PRIMARY KEY NOT NULL,
  `stripe_session_id` text,
  `email` text NOT NULL,
  `plan` text NOT NULL,
  `amount_total` integer NOT NULL,
  `currency` text DEFAULT 'usd' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `access_token` text,
  `paid_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_orders_stripe_session_idx` ON `resume_orders` (`stripe_session_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_orders_access_token_idx` ON `resume_orders` (`access_token`);
--> statement-breakpoint
CREATE INDEX `resume_orders_email_idx` ON `resume_orders` (`email`);
