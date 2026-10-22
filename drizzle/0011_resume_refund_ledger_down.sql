-- Roll back the Resume Builder refund-ledger migration.
-- Order status and entitlement revocations are unaffected: they never depended
-- on these columns. Refund amounts recorded after 0011 are lost on rollback.
DROP INDEX IF EXISTS `resume_refund_events_payment_intent_idx`;
--> statement-breakpoint
DROP TABLE IF EXISTS `resume_refund_events`;
--> statement-breakpoint
ALTER TABLE `resume_orders` DROP COLUMN `stripe_charge_id`;
--> statement-breakpoint
ALTER TABLE `resume_orders` DROP COLUMN `refunded_at`;
--> statement-breakpoint
ALTER TABLE `resume_orders` DROP COLUMN `amount_refunded`;
