CREATE TABLE tags (
  id INTEGER PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE tool_tags (
  tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tool_id, tag_id)
);
--> statement-breakpoint
CREATE INDEX tool_tags_tag_tool_idx ON tool_tags(tag_id, tool_id);
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN converted_tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX submissions_converted_tool_unique ON submissions(converted_tool_id);
--> statement-breakpoint
CREATE TRIGGER tools_tags_after_insert AFTER INSERT ON tools BEGIN
  INSERT INTO tags(slug, name) SELECT 'tag-' || lower(hex(value)), value FROM json_each(NEW.tags) WHERE type = 'text' AND length(trim(value)) > 0 ON CONFLICT(name) DO NOTHING;
  INSERT INTO tool_tags(tool_id, tag_id) SELECT NEW.id, tags.id FROM tags JOIN json_each(NEW.tags) j ON tags.name = j.value WHERE j.type = 'text' GROUP BY tags.id;
END;
--> statement-breakpoint
CREATE TRIGGER tools_tags_after_update AFTER UPDATE OF tags ON tools BEGIN
  DELETE FROM tool_tags WHERE tool_id = NEW.id;
  INSERT INTO tags(slug, name) SELECT 'tag-' || lower(hex(value)), value FROM json_each(NEW.tags) WHERE type = 'text' AND length(trim(value)) > 0 ON CONFLICT(name) DO NOTHING;
  INSERT INTO tool_tags(tool_id, tag_id) SELECT NEW.id, tags.id FROM tags JOIN json_each(NEW.tags) j ON tags.name = j.value WHERE j.type = 'text' GROUP BY tags.id;
END;
--> statement-breakpoint
CREATE TRIGGER tags_sync_after_rename AFTER UPDATE OF name ON tags WHEN OLD.name != NEW.name BEGIN
  UPDATE tools SET tags = (SELECT json_group_array(CASE WHEN j.value = OLD.name THEN NEW.name ELSE j.value END) FROM json_each(tools.tags) j), updated_at = CURRENT_TIMESTAMP
  WHERE id IN (SELECT tool_id FROM tool_tags WHERE tag_id = NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER tags_sync_before_delete BEFORE DELETE ON tags BEGIN
  UPDATE tools SET tags = (SELECT json_group_array(j.value) FROM json_each(tools.tags) j WHERE j.value != OLD.name), updated_at = CURRENT_TIMESTAMP
  WHERE id IN (SELECT tool_id FROM tool_tags WHERE tag_id = OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER categories_restrict_referenced_delete BEFORE DELETE ON categories WHEN EXISTS (SELECT 1 FROM tool_categories WHERE category_id = OLD.id) BEGIN
  SELECT RAISE(ABORT, 'taxonomy_in_use');
END;
--> statement-breakpoint
CREATE TRIGGER scenes_restrict_referenced_delete BEFORE DELETE ON scenes WHEN EXISTS (SELECT 1 FROM tool_scenes WHERE scene_id = OLD.id) BEGIN
  SELECT RAISE(ABORT, 'taxonomy_in_use');
END;
--> statement-breakpoint
CREATE TRIGGER submissions_audit_after_conversion AFTER UPDATE OF converted_tool_id ON submissions WHEN OLD.converted_tool_id IS NULL AND NEW.converted_tool_id IS NOT NULL BEGIN
  INSERT INTO admin_audit_events(action, resource_type, resource_id) VALUES ('submission.convert', 'submission', NEW.id);
  INSERT INTO admin_audit_events(action, resource_type, resource_id) VALUES ('tool.create_draft', 'tool', NEW.converted_tool_id);
END;
