ALTER TABLE `categories` ADD COLUMN `sort_order` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `scenes` ADD COLUMN `sort_order` integer NOT NULL DEFAULT 0;
