/**
 * Vercel often expects a directory literally named `public` at the configured
 * project root. Vite writes to `artifacts/samphone/dist/public`. After build,
 * mirror that output into every `public` location this monorepo might deploy from.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const distPublic = path.join(repoRoot, "artifacts", "samphone", "dist", "public");

if (!fs.existsSync(distPublic)) {
  console.error(`prepare-vercel-public: missing build output: ${distPublic}`);
  process.exit(1);
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyBuildTo(dest) {
  rmrf(dest);
  fs.cpSync(distPublic, dest, { recursive: true });
  console.log(`prepare-vercel-public: synced -> ${dest}`);
}

copyBuildTo(path.join(repoRoot, "public"));
copyBuildTo(path.join(repoRoot, "artifacts", "samphone", "public"));
