-- Additive migration. Export a D1 restore point before production application.
-- Records every Resume Builder refund (partial and full), not only full refunds,
-- so the order source can report a complete refund ledger to Agent A08.
-- Mirrors the eBook refund columns and event table from 0003.
ALTER TABLE `resume_orders` ADD COLUMN `amount_refunded` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `resume_orders` ADD COLUMN `refunded_at` text;
--> statement-breakpoint
ALTER TABLE `resume_orders` ADD COLUMN `stripe_charge_id` text;
--> statement-breakpoint
-- One row per Stripe charge.refunded event. amount_refunded is Stripe's cumulative
-- charge total at that event, so out-of-order or replayed deliveries are safe.
-- Rows are kept even when no order matches yet; checkout reconciles them.
CREATE TABLE IF NOT EXISTS `resume_refund_events` (
  `event_id` text PRIMARY KEY NOT NULL,
  `payment_intent_id` text NOT NULL,
  `charge_id` text,
  `amount_refunded` integer NOT NULL,
  `currency` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resume_refund_events_payment_intent_idx`
  ON `resume_refund_events` (`payment_intent_id`);
--> statement-breakpoint
-- Backfill: before this migration only full refunds changed an order, and they
-- set status = 'refunded'. Record those at the full amount. Their refund time and
-- Stripe charge ID were never stored, so refunded_at and stripe_charge_id stay NULL
-- (the funnel snapshot reports such windows as an incomplete ledger).
UPDATE `resume_orders` SET `amount_refunded` = `amount_total`
WHERE `status` = 'refunded' AND `amount_refunded` = 0;
