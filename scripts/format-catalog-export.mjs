import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog-export.json"), "utf8"));

const MAIN_BRANDS = [
  "iphone-parts",
  "samsung-parts",
  "xiaomi-parts",
  "oneplus-parts",
  "oppo-reno-parts",
  "huawei-parts",
  "motorola-parts",
  "nokia-parts",
  "lg-parts",
  "vivo-parts",
  "google-pixel-parts",
  "realme-parts",
  "zte-parts",
  "alcatel-parts",
  "tcl-parts",
  "other-parts",
  "tablets",
  "repair-tools",
];

const brandTrees = MAIN_BRANDS.map((slug) => {
  const root = data.brands.find((b) => b.slug === slug);
  if (!root) return { slug, name: slug, wooCount: 0, productCount: 0, models: [] };

  const nameLower = root.name.toLowerCase();
  const products = data.products.filter((p) => {
    const pathStr = (p.categoryPath ?? "").toLowerCase();
    return pathStr.includes(nameLower) || pathStr.includes(slug.replace(/-/g, " "));
  });

  return {
    slug,
    name: root.name,
    wooCount: root.count,
    productCount: products.length,
    models: root.models.map((m) => ({
      name: m.name,
      slug: m.slug,
      count: m.count,
    })),
  };
});

function csvEscape(s) {
  return `"${String(s ?? "").replace(/"/g, '""')}"`;
}

const csv = [
  "id,name,slug,sku,price,categories,categoryPath",
  ...data.products.map((p) =>
    [p.id, p.name, p.slug, p.sku, p.price, p.categories, p.categoryPath].map(csvEscape).join(","),
  ),
];
fs.writeFileSync(path.join(repoRoot, "catalog-products.csv"), csv.join("\n"));

let md = "# Samphone catalog export\n\n";
md += "Generated from live WooCommerce (`samphone.pt`).\n\n";
md += "## Summary\n\n";
md += `- **Total products:** ${data.summary.totalProducts}\n`;
md += `- **Total WooCommerce categories:** ${data.summary.totalCategories}\n\n`;
md += "## Main brands\n\n";

for (const b of brandTrees) {
  md += `### ${b.name} (\`${b.slug}\`)\n\n`;
  md += `- Woo category product count: ${b.wooCount}\n`;
  md += `- Products in export matching brand: ${b.productCount}\n`;
  if (b.models.length) {
    md += "\n**Subcategories / models:**\n\n";
    for (const m of b.models) {
      md += `- ${m.name} (${m.count} products) — \`${m.slug}\`\n`;
    }
  }
  md += "\n";
}

fs.writeFileSync(path.join(repoRoot, "catalog-brands-summary.md"), md);
fs.writeFileSync(path.join(repoRoot, "catalog-brands-detail.json"), JSON.stringify(brandTrees, null, 2));

console.log("Wrote catalog-products.csv, catalog-brands-summary.md, catalog-brands-detail.json");
