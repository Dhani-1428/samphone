import { accessoriesColumns, cardsColumns, smartphonesColumns } from "@/data/categories";
import type { WooProduct } from "@/lib/woocommerce";

const SMARTPHONE_CATEGORY_SLUGS = new Set(smartphonesColumns.flatMap((c) => c.items.map((i) => i.slug)));
const ACCESSORY_CATEGORY_SLUGS = new Set(accessoriesColumns.flatMap((c) => c.items.map((i) => i.slug)));
const CARD_CATEGORY_SLUGS = new Set(cardsColumns.flatMap((c) => c.items.map((i) => i.slug)));

const MULTI_BRAND_NAMES = ["Hoco", "Baseus", "Anker", "Ugreen", "Joyroom", "WK Design", "WK"];

function matchesSlugSet(p: WooProduct, slugs: Set<string>): boolean {
  return p.categories?.some((c) => slugs.has(c.slug)) ?? false;
}

export function filterSmartphoneParts(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => matchesSlugSet(p, SMARTPHONE_CATEGORY_SLUGS));
}

export function filterAccessoryCatalog(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => matchesSlugSet(p, ACCESSORY_CATEGORY_SLUGS));
}

export function filterCardsCatalog(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => matchesSlugSet(p, CARD_CATEGORY_SLUGS));
}

export function filterAccessoryChip(products: WooProduct[], chip: string): WooProduct[] {
  if (chip === "All") return products;
  const col = accessoriesColumns.find((c) => c.title === chip);
  if (!col) return products;
  const slugs = new Set(col.items.map((i) => i.slug));
  return products.filter((p) => matchesSlugSet(p, slugs));
}

export function filterOnSale(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => {
    const sale = Number.parseFloat(p.sale_price ?? "");
    const reg = Number.parseFloat(p.regular_price ?? "");
    const price = Number.parseFloat(p.price ?? "");
    if (Number.isFinite(sale) && sale > 0 && Number.isFinite(reg) && sale < reg) return true;
    if (Number.isFinite(reg) && Number.isFinite(price) && price < reg) return true;
    return false;
  });
}

export function sortNewest(products: WooProduct[]): WooProduct[] {
  return [...products].sort((a, b) => {
    const da = a.date_created ?? "";
    const db = b.date_created ?? "";
    if (da && db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

export function pickHomeFeatured(products: WooProduct[], limit: number): WooProduct[] {
  return sortNewest(products).slice(0, limit);
}

export function filterSmartphoneBrand(products: WooProduct[], brandLabel: string | null, limit = 24): WooProduct[] {
  const base = filterSmartphoneParts(products);
  if (!brandLabel) return base.slice(0, limit);
  const kw = brandLabel.toLowerCase().replace(/\s+parts$/i, "").trim();
  if (!kw) return base.slice(0, limit);
  const sub = base.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      (p.categories?.some((c) => c.slug.includes(kw) || c.name.toLowerCase().includes(kw)) ?? false),
  );
  return (sub.length ? sub : base).slice(0, limit);
}

export function filterMultiBrandCatalog(products: WooProduct[], brand: string | null, limit = 24): WooProduct[] {
  const needles = (brand ? [brand] : MULTI_BRAND_NAMES).map((b) => b.toLowerCase());
  const out = products.filter((p) => {
    const hay = `${p.name} ${p.categories?.map((c) => c.name).join(" ") ?? ""}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
  return out.slice(0, limit);
}

export function sortByPrice(products: WooProduct[], order: "asc" | "desc"): WooProduct[] {
  return [...products].sort((a, b) => {
    const pa = Number.parseFloat(a.price ?? "NaN");
    const pb = Number.parseFloat(b.price ?? "NaN");
    const na = Number.isFinite(pa) ? pa : Infinity;
    const nb = Number.isFinite(pb) ? pb : Infinity;
    return order === "asc" ? na - nb : nb - na;
  });
}
