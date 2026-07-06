/**
 * Extract navigation model lists from Navbar.tsx into catalog-nav-models.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const navbarPath = path.join(repoRoot, "artifacts", "samphone", "src", "components", "Navbar.tsx");
const text = fs.readFileSync(navbarPath, "utf8");

const re = /const ([A-Z0-9_]+_MODELS) = \[([\s\S]*?)\];/g;
const out = {};
let m;

while ((m = re.exec(text)) !== null) {
  const key = m[1];
  const body = m[2];
  const models = [...body.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  out[key] = models;
}

const summary = Object.entries(out).map(([family, models]) => ({
  family,
  count: models.length,
  models,
}));

fs.writeFileSync(
  path.join(repoRoot, "catalog-nav-models.json"),
  JSON.stringify({ families: summary.length, totalModels: summary.reduce((n, s) => n + s.count, 0), series: summary }, null, 2),
);

console.log(`Extracted ${summary.length} model families, ${summary.reduce((n, s) => n + s.count, 0)} nav models`);
