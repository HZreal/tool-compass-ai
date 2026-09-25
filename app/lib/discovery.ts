import type { CatalogScene, CatalogTool, CatalogFilters } from "./catalog";

export type DiscoveryFilters = {
  query?: string;
  category?: string;
  scene?: string;
  platform?: CatalogFilters['platform'];
  pricing?: CatalogFilters['pricing'];
  region?: "domestic" | "overseas";
  featured?: boolean;
  page?: number;
};

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

export function requireCatalogScene(scene: CatalogScene | null): CatalogScene {
  if (!scene) throw new DiscoveryRouteNotFound();
  return scene;
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

    if (filters.pricing === "free" && !['free', 'freemium'].includes(tool.pricingModel)) return false;
    if (filters.pricing === "paid" && !['freemium', 'paid', 'usage_based', 'contact'].includes(tool.pricingModel)) return false;
    return true;
  });
}

export function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
