ALTER TABLE `tools` ADD COLUMN `aliases` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `tools` ADD COLUMN `logo_url` text;
--> statement-breakpoint
ALTER TABLE `tools` ADD COLUMN `region` text NOT NULL DEFAULT 'overseas' CHECK (`region` IN ('domestic', 'overseas'));
--> statement-breakpoint
ALTER TABLE `tools` ADD COLUMN `featured_rank` integer;
--> statement-breakpoint
DROP INDEX `tools_status_featured_idx`;
--> statement-breakpoint
CREATE INDEX `tools_status_featured_rank_idx` ON `tools` (`status`, `featured`, `featured_rank`);
--> statement-breakpoint
CREATE INDEX `tools_status_region_idx` ON `tools` (`status`, `region`);
--> statement-breakpoint
DROP TRIGGER `tools_ai`;
--> statement-breakpoint
DROP TRIGGER `tools_ad`;
--> statement-breakpoint
DROP TRIGGER `tools_au`;
--> statement-breakpoint
DROP TABLE `tools_fts`;
--> statement-breakpoint
CREATE VIRTUAL TABLE `tools_fts` USING fts5(`name`, `aliases`, `description`, `tags`, `slug`, content='tools', content_rowid='id', tokenize='trigram');
--> statement-breakpoint
CREATE TRIGGER `tools_ai` AFTER INSERT ON `tools` BEGIN
  INSERT INTO `tools_fts` (`rowid`, `name`, `aliases`, `description`, `tags`, `slug`) VALUES (new.`id`, new.`name`, new.`aliases`, new.`description`, new.`tags`, new.`slug`);
END;
--> statement-breakpoint
CREATE TRIGGER `tools_ad` AFTER DELETE ON `tools` BEGIN
  INSERT INTO `tools_fts` (`tools_fts`, `rowid`, `name`, `aliases`, `description`, `tags`, `slug`) VALUES ('delete', old.`id`, old.`name`, old.`aliases`, old.`description`, old.`tags`, old.`slug`);
END;
--> statement-breakpoint
CREATE TRIGGER `tools_au` AFTER UPDATE ON `tools` BEGIN
  INSERT INTO `tools_fts` (`tools_fts`, `rowid`, `name`, `aliases`, `description`, `tags`, `slug`) VALUES ('delete', old.`id`, old.`name`, old.`aliases`, old.`description`, old.`tags`, old.`slug`);
  INSERT INTO `tools_fts` (`rowid`, `name`, `aliases`, `description`, `tags`, `slug`) VALUES (new.`id`, new.`name`, new.`aliases`, new.`description`, new.`tags`, new.`slug`);
END;
--> statement-breakpoint
INSERT INTO `tools_fts` (`rowid`, `name`, `aliases`, `description`, `tags`, `slug`)
SELECT `id`, `name`, `aliases`, `description`, `tags`, `slug` FROM `tools`;
