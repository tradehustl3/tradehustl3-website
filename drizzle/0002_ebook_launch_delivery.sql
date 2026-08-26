-- Track preorder confirmation separately from the real launch delivery.
ALTER TABLE `ebook_orders` ADD COLUMN `launch_emailed_at` text;
--> statement-breakpoint
ALTER TABLE `ebook_orders` ADD COLUMN `launch_email_lease_until` integer;
