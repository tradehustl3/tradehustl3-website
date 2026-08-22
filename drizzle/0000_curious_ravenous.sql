CREATE TABLE `ebook_orders` (
	`stripe_session_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`payment_link_id` text NOT NULL,
	`amount_total` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`download_token` text NOT NULL,
	`emailed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ebook_orders_download_token_unique` ON `ebook_orders` (`download_token`);--> statement-breakpoint
CREATE INDEX `ebook_orders_email_idx` ON `ebook_orders` (`email`);