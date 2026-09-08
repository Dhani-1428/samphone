/**
 * Vercel production build: Vite storefront + copy `public/` + sync `/api`.
 * Clears PORT so a pasted API .env (PORT= / PORT=8080 / socket) cannot break Vite.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

delete process.env.PORT;

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
}

run("pnpm", ["--filter", "@workspace/samphone", "run", "build"]);
run(process.execPath, [path.join(repoRoot, "scripts", "prepare-vercel-public.mjs")]);
run(process.execPath, [path.join(repoRoot, "scripts", "sync-vercel-api.mjs")]);
