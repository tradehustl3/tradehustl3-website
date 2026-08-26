-- Roll back the eBook launch-delivery bookkeeping columns.
ALTER TABLE `ebook_orders` DROP COLUMN `launch_email_lease_until`;
--> statement-breakpoint
ALTER TABLE `ebook_orders` DROP COLUMN `launch_emailed_at`;
