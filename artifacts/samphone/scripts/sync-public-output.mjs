import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const distPublicDir = resolve(appRoot, "dist/public");
const publicDir = resolve(appRoot, "public");

if (!existsSync(distPublicDir)) {
  console.warn(`[sync-public-output] Missing source directory: ${distPublicDir}`);
  process.exit(0);
}

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distPublicDir, publicDir, { recursive: true });

console.log(`[sync-public-output] Synced ${distPublicDir} -> ${publicDir}`);
