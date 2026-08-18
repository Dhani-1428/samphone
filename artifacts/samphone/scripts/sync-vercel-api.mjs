import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runner = path.join(path.dirname(fileURLToPath(import.meta.url)), "run-repo-script.mjs");
const result = spawnSync(process.execPath, [runner, "sync-vercel-api.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
