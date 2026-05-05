const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const sourceDir = path.join(repoRoot, "artifacts", "samphone", "dist", "public");
const outputDir = path.join(repoRoot, "public");

if (!fs.existsSync(sourceDir)) {
  console.warn(`[sync-vercel-public] Source not found: ${sourceDir}`);
  process.exit(0);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

console.log(`[sync-vercel-public] Synced ${sourceDir} -> ${outputDir}`);
