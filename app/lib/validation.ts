import { z } from "zod";

const httpsUrl = z.string().trim().url("请输入有效的官网地址").refine(
  (value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  },
  "官网地址必须使用 HTTPS",
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
  description: z.string().trim().min(20, "简介至少 20 个字符").max(160, "简介最多 160 个字符"),
  websiteUrl: httpsUrl,
  pricing: z.string().trim().min(1, "请填写定价信息").max(160),
  tags: stringList,
  verifiedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "核验日期格式必须为 YYYY-MM-DD"),
  editorialNote: z.string().trim().max(1_000),
  platforms: stringList,
  languages: stringList,
  featured: z.boolean().default(false),
  categorySlugs: z.array(slug).max(20),
  sceneSlugs: z.array(slug).max(20),
}).refine(
  ({ categorySlugs, sceneSlugs }) => categorySlugs.length + sceneSlugs.length > 0,
  { message: "至少选择一个分类或场景", path: ["categorySlugs"] },
);

export const adminToolMutationSchema = z.discriminatedUnion("action", [
  z.object({ id: z.number().int().positive(), action: z.literal("edit"), tool: adminToolSchema }),
  z.object({ id: z.number().int().positive(), action: z.literal("publish") }),
  z.object({ id: z.number().int().positive(), action: z.literal("archive") }),
]);

export const adminSubmissionReviewSchema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().min(1, "请填写审核说明").max(1_000, "审核说明最多 1000 个字符"),
});

export type AdminToolInput = z.infer<typeof adminToolSchema>;
