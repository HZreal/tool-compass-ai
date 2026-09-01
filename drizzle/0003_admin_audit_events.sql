CREATE TABLE `admin_audit_events` (
  `id` integer PRIMARY KEY NOT NULL,
  `action` text NOT NULL,
  `resource_type` text NOT NULL,
  `resource_id` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `admin_audit_events_resource_created_at_idx`
ON `admin_audit_events` (`resource_type`, `resource_id`, `created_at`);
