import { z } from "zod";

const httpsUrl = z.string().trim().max(2048, "URL 最多 2048 个字符").url("请输入有效的 HTTPS 地址").refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  },
  "地址必须使用 HTTPS，且不能包含用户名或密码",
).transform((value) => new URL(value).toString());

export const submissionSchema = z.object({
  type: z.enum(["recommendation", "correction"]),
  toolName: z.string().trim().min(1, "请填写工具名称").max(80, "工具名称最多 80 个字符"),
  websiteUrl: httpsUrl,
  message: z.string().trim().min(1, "请填写推荐或纠错说明").max(2_000, "说明最多 2000 个字符"),
  email: z.string().trim().email("请输入有效邮箱").max(320, "邮箱地址过长").optional().or(z.literal("")).transform((value) => value || undefined),
  company: z.string().max(200).optional().default(""),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

const slug = z.string().trim().min(1, "请填写 slug").max(80, "slug 最多 80 个字符").regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "slug 只能包含小写字母、数字和连字符",
);

const stringList = z.array(z.string().trim().min(1).max(80)).max(30);

export const adminToolSchema = z.object({
  slug,
  name: z.string().trim().min(1, "请填写工具名称").max(80, "工具名称最多 80 个字符"),
  description: z.string().trim().max(160, "简介最多 160 个字符").default(""),
  websiteUrl: httpsUrl.or(z.literal("")).default(""),
  region: z.enum(["domestic", "overseas"]).default("overseas"),
  aliases: stringList.default([]),
  logoUrl: httpsUrl.or(z.literal("")).nullable().default(null),
  sources: z.array(httpsUrl).max(20, "来源最多 20 个").default([]),
  pricing: z.string().trim().max(160).default(""),
  pricingModel: z.enum(["free", "freemium", "paid", "usage_based", "contact", "unknown"]).default("unknown"),
  tags: stringList.default([]),
  verifiedAt: z.string().trim().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "核验日期必须是有效的 YYYY-MM-DD 日期").default(""),
  editorialNote: z.string().trim().max(1_000).default(""),
  platforms: stringList.default([]),
  languages: stringList.default([]),
  featured: z.boolean().default(false),
  featuredRank: z.number().int().min(0).max(1_000_000).nullable().default(null),
  categorySlugs: z.array(slug).max(20).default([]),
  sceneSlugs: z.array(slug).max(20).default([]),
});

export const publishableToolSchema = adminToolSchema.superRefine((tool, context) => {
  const required: [boolean, string, string][] = [
    [tool.description.length >= 20, "description", "简介至少 20 个字符"],
    [Boolean(tool.websiteUrl), "websiteUrl", "请填写 HTTPS 官网地址"],
    [Boolean(tool.pricing), "pricing", "请填写定价信息"],
    [Boolean(tool.verifiedAt), "verifiedAt", "请填写核验日期"],
    [tool.categorySlugs.length > 0, "categorySlugs", "至少选择一个分类"],
    [tool.sceneSlugs.length > 0, "sceneSlugs", "至少选择一个场景"],
  ];
  for (const [valid, path, message] of required) {
    if (!valid) context.addIssue({ code: "custom", path: [path], message });
  }
});

export const adminToolMutationSchema = z.discriminatedUnion("action", [
  z.object({ id: z.number().int().positive(), action: z.literal("edit"), tool: adminToolSchema }),
  z.object({ id: z.number().int().positive(), action: z.literal("publish") }),
  z.object({ id: z.number().int().positive(), action: z.literal("archive") }),
]);

export const adminSubmissionReviewSchema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(["approved", "rejected", "convert"]),
  reviewNote: z.string().trim().min(1, "请填写审核说明").max(1_000, "审核说明最多 1000 个字符"),
});

export type AdminToolInput = z.infer<typeof adminToolSchema>;
