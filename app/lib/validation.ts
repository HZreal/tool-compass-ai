import { z } from "zod";

const httpsUrl = z.string().trim().url("请输入有效的官网地址").refine(
  (value) => new URL(value).protocol === "https:",
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
