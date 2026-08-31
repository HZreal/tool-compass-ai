import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const persistPath = join(root, ".wrangler", "state");
const configPath = join(root, "tests", "e2e", "wrangler.json");
const seedPath = join(root, "tests", "e2e", "seed.sql");
const options = {
  cwd: root,
  env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
  stdio: "inherit" as const,
};

execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", configPath, "--persist-to", persistPath], options);
execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--config", configPath, "--persist-to", persistPath, "--file", seedPath], options);

const server = spawn("npm", ["run", "dev"], options);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
