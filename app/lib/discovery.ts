import type { CatalogTool } from "./catalog";

export type DiscoveryFilters = {
  query?: string;
  category?: string;
  scene?: string;
  platform?: string;
  pricing?: string;
  featured?: boolean;
};

export type SceneDefinition = {
  slug: string;
  name: string;
  description: string;
  index: string;
};

export const categoryOptions = [
  { slug: "ai-assistants", name: "聊天与问答" },
  { slug: "code-development", name: "编程与开发" },
  { slug: "image-generation", name: "图像与设计" },
  { slug: "video-audio", name: "视频与音频" },
  { slug: "productivity", name: "办公与效率" },
  { slug: "data-research", name: "学习与研究" },
  { slug: "automation-agents", name: "智能体与自动化" },
  { slug: "design-collaboration", name: "设计与协作" },
] as const;

export const sceneOptions: readonly SceneDefinition[] = [
  { slug: "chat", name: "写作与对话", description: "起草、改写、总结与日常问答", index: "01" },
  { slug: "coding", name: "辅助编程", description: "构建、测试与维护软件", index: "02" },
  { slug: "visual", name: "生成图片", description: "创作图像、版式与演示设计", index: "03" },
  { slug: "media", name: "制作视频", description: "生产视频、音频与声音", index: "04" },
  { slug: "research", name: "研究分析", description: "查找证据、阅读与分析数据", index: "05" },
  { slug: "workflow", name: "自动化流程", description: "连接工具并自动处理重复工作", index: "06" },
] as const;

export class DiscoveryRouteNotFound extends Error {
  constructor() {
    super("Published tool not found");
    this.name = "DiscoveryRouteNotFound";
  }
}

export function requirePublishedTool(tool: CatalogTool | null): CatalogTool {
  if (!tool || tool.status !== "published") throw new DiscoveryRouteNotFound();
  return tool;
}

export function filterDisplayTools(tools: CatalogTool[], filters: DiscoveryFilters): CatalogTool[] {
  return tools.filter((tool) => {
    if (filters.platform) {
      const platforms = tool.platforms.map((platform) => platform.toLowerCase());
      const matchesPlatform = filters.platform === "desktop"
        ? platforms.some((platform) => ["macos", "windows", "linux"].includes(platform))
        : filters.platform === "mobile"
          ? platforms.some((platform) => ["ios", "android"].includes(platform))
          : platforms.includes(filters.platform.toLowerCase());
      if (!matchesPlatform) return false;
    }

    if (filters.pricing === "free" && !/(free|open-source)/i.test(tool.pricing)) return false;
    if (filters.pricing === "paid" && !/(paid|subscription|usage-based|plans?)/i.test(tool.pricing)) return false;
    return true;
  });
}

export function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
