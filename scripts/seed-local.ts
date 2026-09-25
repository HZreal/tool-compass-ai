import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { renderCatalogResetSql } from "../db/seed";

const root = process.cwd();
const d1Directory = join(root, ".wrangler", "state", "v3", "d1");

if (!existsSync(d1Directory)) throw new Error("本地 D1 尚未初始化。请先运行迁移，再运行此命令。");

let openProcessIds = "";
try {
  openProcessIds = execFileSync("lsof", ["-t", d1Directory], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch {
  // lsof exits with 1 when no process is using the directory.
}
if (openProcessIds) throw new Error("本地 D1 正由开发服务器使用。请先停止 npm run dev，再运行 npm run db:seed:local。");

execFileSync(
  "npx",
  [
    "wrangler", "d1", "execute", "DB", "--local", "--config", "tests/e2e/wrangler.json",
    "--persist-to", join(root, ".wrangler", "state"), "--command", renderCatalogResetSql().replaceAll("\n--> statement-breakpoint\n", ";\n"),
  ],
  { cwd: root, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" }, stdio: "inherit" },
);
