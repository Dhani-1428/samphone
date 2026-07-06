/**
 * Mirror repo-root /api into artifacts/samphone/api for Vercel projects
 * whose Root Directory is artifacts/samphone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(repoRoot, "api");
const dest = path.join(repoRoot, "artifacts", "samphone", "api");

if (!fs.existsSync(src)) {
  console.warn("sync-vercel-api: no root api/ folder, skipping");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`sync-vercel-api: ${src} -> ${dest}`);
