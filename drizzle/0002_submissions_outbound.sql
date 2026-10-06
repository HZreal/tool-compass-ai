CREATE TABLE `submissions` (
  `id` integer PRIMARY KEY NOT NULL,
  `type` text NOT NULL CHECK (`type` IN ('recommendation', 'correction')),
  `tool_name` text NOT NULL,
  `website_url` text NOT NULL,
  `message` text NOT NULL,
  `email` text,
  `status` text NOT NULL DEFAULT 'pending' CHECK (`status` IN ('pending', 'approved', 'rejected')),
  `review_note` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `submissions_status_created_at_idx` ON `submissions` (`status`, `created_at`);
--> statement-breakpoint
CREATE TABLE `outbound_events` (
  `id` integer PRIMARY KEY NOT NULL,
  `tool_id` integer NOT NULL REFERENCES `tools` (`id`) ON DELETE cascade,
  `source_path` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `outbound_events_tool_created_at_idx` ON `outbound_events` (`tool_id`, `created_at`);
