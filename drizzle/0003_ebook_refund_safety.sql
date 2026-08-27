-- Add durable Stripe payment correlation and refund state to existing eBook orders.
ALTER TABLE `ebook_orders` ADD COLUMN `stripe_payment_intent_id` text;
--> statement-breakpoint
ALTER TABLE `ebook_orders` ADD COLUMN `amount_refunded` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `ebook_orders` ADD COLUMN `refunded_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `ebook_orders_payment_intent_idx`
  ON `ebook_orders` (`stripe_payment_intent_id`);
--> statement-breakpoint
CREATE TABLE `ebook_refund_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`payment_intent_id` text NOT NULL,
	`amount_refunded` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ebook_refund_events_payment_intent_idx`
  ON `ebook_refund_events` (`payment_intent_id`);
