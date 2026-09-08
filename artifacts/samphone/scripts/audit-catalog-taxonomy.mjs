#!/usr/bin/env node
/**
 * Audit catalog taxonomy.
 * Usage:
 *   node --experimental-strip-types scripts/audit-catalog-taxonomy.mjs
 *   node --experimental-strip-types scripts/audit-catalog-taxonomy.mjs path/to/products.json
 *
 * products.json should be an array of { name, catalogGroup?, partType?, subcategory?, categories? }.
 */
import { readFileSync } from "node:fs";
import { classifyCatalogProduct, suggestedTaxonomyFields } from "../src/lib/catalog-taxonomy.ts";

const arg = process.argv[2];
const samples = arg
  ? JSON.parse(readFileSync(arg, "utf8"))
  : [
      { name: "Silicon Soft Jelly Cover iPhone 17 Pro Max", catalogGroup: "Phone Parts" },
      { name: "Back Cover iPhone 17 Pro Max", catalogGroup: "Phone Parts" },
      { name: "Touch + LCD OLED iPhone 17 Pro Max", catalogGroup: "Phone Parts" },
      { name: "Battery iPhone 17 Pro Max" },
      { name: "Unknown SKU 123" },
    ];

if (!Array.isArray(samples)) {
  console.error("Expected a JSON array of products");
  process.exit(1);
}

const rows = samples.map((p) => {
  const cls = classifyCatalogProduct(p);
  return { name: p.name, ...cls, suggested: suggestedTaxonomyFields(p) };
});
const flagged = rows.filter((r) => r.issues.length > 0);
console.log(`audited=${rows.length} flagged=${flagged.length}`);
for (const row of flagged.slice(0, 80)) {
  console.log(`- ${row.name} :: ${row.issues.join(", ")} -> ${row.suggested.category}/${row.suggested.subcategory}`);
}
if (flagged.length) process.exitCode = 1;
