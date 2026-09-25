CREATE TABLE `categories` (
  `id` integer PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);
--> statement-breakpoint
CREATE TABLE `scenes` (
  `id` integer PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenes_slug_unique` ON `scenes` (`slug`);
--> statement-breakpoint
CREATE TABLE `tools` (
  `id` integer PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `website_url` text NOT NULL,
  `pricing` text NOT NULL,
  `tags` text NOT NULL,
  `verified_at` text NOT NULL,
  `editorial_note` text NOT NULL,
  `platforms` text NOT NULL,
  `languages` text NOT NULL,
  `status` text NOT NULL DEFAULT 'draft' CHECK (`status` IN ('draft', 'published', 'archived')),
  `featured` integer NOT NULL DEFAULT 0 CHECK (`featured` IN (0, 1)),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tools_slug_unique` ON `tools` (`slug`);
--> statement-breakpoint
CREATE INDEX `tools_status_featured_idx` ON `tools` (`status`, `featured`);
--> statement-breakpoint
CREATE TABLE `tool_categories` (
  `tool_id` integer NOT NULL REFERENCES `tools` (`id`) ON DELETE cascade,
  `category_id` integer NOT NULL REFERENCES `categories` (`id`) ON DELETE cascade,
  PRIMARY KEY (`tool_id`, `category_id`)
);
--> statement-breakpoint
CREATE INDEX `tool_categories_category_tool_idx` ON `tool_categories` (`category_id`, `tool_id`);
--> statement-breakpoint
CREATE TABLE `tool_scenes` (
  `tool_id` integer NOT NULL REFERENCES `tools` (`id`) ON DELETE cascade,
  `scene_id` integer NOT NULL REFERENCES `scenes` (`id`) ON DELETE cascade,
  PRIMARY KEY (`tool_id`, `scene_id`)
);
--> statement-breakpoint
CREATE INDEX `tool_scenes_scene_tool_idx` ON `tool_scenes` (`scene_id`, `tool_id`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `tools_fts` USING fts5(`name`, `description`, `slug`, content='tools', content_rowid='id', tokenize='trigram');
--> statement-breakpoint
CREATE TRIGGER `tools_ai` AFTER INSERT ON `tools` BEGIN
  INSERT INTO `tools_fts` (`rowid`, `name`, `description`, `slug`) VALUES (new.`id`, new.`name`, new.`description`, new.`slug`);
END;
--> statement-breakpoint
CREATE TRIGGER `tools_ad` AFTER DELETE ON `tools` BEGIN
  INSERT INTO `tools_fts` (`tools_fts`, `rowid`, `name`, `description`, `slug`) VALUES ('delete', old.`id`, old.`name`, old.`description`, old.`slug`);
END;
--> statement-breakpoint
CREATE TRIGGER `tools_au` AFTER UPDATE ON `tools` BEGIN
  INSERT INTO `tools_fts` (`tools_fts`, `rowid`, `name`, `description`, `slug`) VALUES ('delete', old.`id`, old.`name`, old.`description`, old.`slug`);
  INSERT INTO `tools_fts` (`rowid`, `name`, `description`, `slug`) VALUES (new.`id`, new.`name`, new.`description`, new.`slug`);
END;
