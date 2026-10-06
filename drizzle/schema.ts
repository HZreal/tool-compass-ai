import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const toolStatuses = ["draft", "published", "archived"] as const;
export type ToolStatus = (typeof toolStatuses)[number];

export const toolRegions = ["domestic", "overseas"] as const;
export type ToolRegion = (typeof toolRegions)[number];

export const pricingModels = ['free', 'freemium', 'paid', 'usage_based', 'contact', 'unknown'] as const;
export type PricingModel = (typeof pricingModels)[number];

export const submissionTypes = ["recommendation", "correction"] as const;
export type SubmissionType = (typeof submissionTypes)[number];

export const submissionStatuses = ["pending", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const scenes = sqliteTable("scenes", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("scenes_slug_unique").on(table.slug)]);

export const tools = sqliteTable("tools", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  aliases: text("aliases").notNull().default("[]"),
  description: text("description").notNull(),
  websiteUrl: text("website_url").notNull(),
  logoUrl: text("logo_url"),
  region: text("region", { enum: toolRegions }).notNull().default("overseas"),
  pricing: text("pricing").notNull(),
  pricingModel: text("pricing_model", { enum: pricingModels }).notNull().default('unknown'),
  sources: text('sources').notNull().default('[]'),
  tags: text("tags").notNull(),
  verifiedAt: text("verified_at").notNull(),
  editorialNote: text("editorial_note").notNull(),
  platforms: text("platforms").notNull(),
  languages: text("languages").notNull(),
  status: text("status", { enum: toolStatuses }).notNull().default("draft"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  featuredRank: integer("featured_rank"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tools_slug_unique").on(table.slug),
  index("tools_status_featured_rank_idx").on(table.status, table.featured, table.featuredRank),
  index("tools_status_region_idx").on(table.status, table.region),
  index("tools_status_pricing_model_idx").on(table.status, table.pricingModel),
]);

export const toolCategories = sqliteTable("tool_categories", {
  toolId: integer("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.toolId, table.categoryId] })]);

export const toolScenes = sqliteTable("tool_scenes", {
  toolId: integer("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
  sceneId: integer("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.toolId, table.sceneId] })]);

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const toolTags = sqliteTable('tool_tags', {
  toolId: integer('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, table => [primaryKey({ columns: [table.toolId, table.tagId] })]);

export const catalogImports = sqliteTable('catalog_imports', {
  id: text('id').primaryKey(),
  importedAt: text('imported_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey(),
  type: text("type", { enum: submissionTypes }).notNull(),
  toolName: text("tool_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  message: text("message").notNull(),
  email: text("email"),
  status: text("status", { enum: submissionStatuses }).notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
  convertedToolId: integer("converted_tool_id").references(() => tools.id, { onDelete: 'set null' }).unique(),
}, (table) => [index("submissions_status_created_at_idx").on(table.status, table.createdAt)]);

export const outboundEvents = sqliteTable("outbound_events", {
  id: integer("id").primaryKey(),
  toolId: integer("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
  sourcePath: text("source_path").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("outbound_events_tool_created_at_idx").on(table.toolId, table.createdAt)]);

export const adminAuditEvents = sqliteTable("admin_audit_events", {
  id: integer("id").primaryKey(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("admin_audit_events_resource_created_at_idx").on(
    table.resourceType,
    table.resourceId,
    table.createdAt,
  ),
]);
