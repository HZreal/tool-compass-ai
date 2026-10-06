ALTER TABLE tools ADD COLUMN pricing_model TEXT NOT NULL DEFAULT 'unknown' CHECK (pricing_model IN ('free', 'freemium', 'paid', 'usage_based', 'contact', 'unknown'));
--> statement-breakpoint
CREATE INDEX tools_status_pricing_model_idx ON tools (status, pricing_model);
--> statement-breakpoint
CREATE TABLE catalog_imports (id TEXT PRIMARY KEY NOT NULL, imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
