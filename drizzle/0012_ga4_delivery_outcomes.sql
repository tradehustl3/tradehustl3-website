-- Additive migration. Export a D1 restore point before production application.
-- One row per GA4-eligible Resume Builder funnel event, recording only whether
-- it was forwarded to GA4 and, if not, why. Stores the event name, a fixed
-- outcome label and the server time: no user, session, cookie or request data.
-- The Worker tolerates this table being absent (the write is skipped), so this
-- can be applied before or after the deploy that starts writing to it.
CREATE TABLE IF NOT EXISTS `ga4_delivery_outcomes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `event_name` text NOT NULL,
  `outcome` text NOT NULL CHECK (`outcome` IN ('sent', 'no_consent', 'no_ga_cookie', 'no_ga_session', 'not_configured')),
  `occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ga4_delivery_outcomes_time_idx`
  ON `ga4_delivery_outcomes` (`occurred_at`);
