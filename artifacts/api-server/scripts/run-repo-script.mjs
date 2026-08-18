/**
 * Vercel Root Directory is often `artifacts/api-server`. Dashboard build
 * commands call `node scripts/*.mjs` relative to that folder — forward to
 * the real scripts at the repo root.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find repo root (pnpm-workspace.yaml)");
    }
    dir = parent;
  }
}

const scriptName = process.argv[2];
if (!scriptName) {
  console.error("usage: node run-repo-script.mjs <script-name.mjs>");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(here);
const script = path.join(repoRoot, "scripts", scriptName);

if (!fs.existsSync(script)) {
  console.error(`run-repo-script: missing ${script}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [script, ...process.argv.slice(3)], {
  stdio: "inherit",
  cwd: repoRoot,
});

process.exit(result.status ?? 1);
