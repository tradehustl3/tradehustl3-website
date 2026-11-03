-- Roll back the GA4 delivery-outcome measurement migration.
-- Funnel events, GA4 delivery itself and the Agent 1 counts are unaffected;
-- the snapshot reports ga4Delivery as null once the table is gone.
DROP INDEX IF EXISTS `ga4_delivery_outcomes_time_idx`;
--> statement-breakpoint
DROP TABLE IF EXISTS `ga4_delivery_outcomes`;
