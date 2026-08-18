/**
 * Copies the Vercel build output to `public/` folder(s) for static hosting.
 * Invoked from vercel.json buildCommand after the samphone Vite build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const distPublic = path.join(repoRoot, "artifacts", "samphone", "dist", "public");

const targets = [
  path.join(repoRoot, "public"),
  path.join(repoRoot, "artifacts", "samphone", "public"),
  path.join(repoRoot, "artifacts", "api-server", "public"),
];

if (!fs.existsSync(distPublic)) {
  console.error(`prepare-vercel-public: missing build output: ${distPublic}`);
  process.exit(1);
}

for (const dest of targets) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(distPublic, dest, { recursive: true });
  console.log(`prepare-vercel-public: synced -> ${dest}`);
}
