-- Roll back the eBook refund-safety migration.
DROP INDEX IF EXISTS `ebook_refund_events_payment_intent_idx`;
--> statement-breakpoint
DROP TABLE IF EXISTS `ebook_refund_events`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ebook_orders_payment_intent_idx`;
--> statement-breakpoint
ALTER TABLE `ebook_orders` DROP COLUMN `refunded_at`;
--> statement-breakpoint
ALTER TABLE `ebook_orders` DROP COLUMN `amount_refunded`;
--> statement-breakpoint
ALTER TABLE `ebook_orders` DROP COLUMN `stripe_payment_intent_id`;
