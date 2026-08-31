import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const toolStatuses = ["draft", "published", "archived"] as const;
export type ToolStatus = (typeof toolStatuses)[number];

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const scenes = sqliteTable("scenes", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
}, (table) => [uniqueIndex("scenes_slug_unique").on(table.slug)]);

export const tools = sqliteTable("tools", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  websiteUrl: text("website_url").notNull(),
  pricing: text("pricing").notNull(),
  tags: text("tags").notNull(),
  verifiedAt: text("verified_at").notNull(),
  editorialNote: text("editorial_note").notNull(),
  platforms: text("platforms").notNull(),
  languages: text("languages").notNull(),
  status: text("status", { enum: toolStatuses }).notNull().default("draft"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tools_slug_unique").on(table.slug),
  index("tools_status_featured_idx").on(table.status, table.featured),
]);

export const toolCategories = sqliteTable("tool_categories", {
  toolId: integer("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.toolId, table.categoryId] })]);

export const toolScenes = sqliteTable("tool_scenes", {
  toolId: integer("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
  sceneId: integer("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.toolId, table.sceneId] })]);
