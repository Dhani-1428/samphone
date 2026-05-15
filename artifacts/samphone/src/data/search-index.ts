import { allSlugs } from "@/data/categories";
import {
  ACCESSORIES_PRODUCTS,
  CARDS_PRODUCTS,
  DEAL_PRODUCTS,
  HOME_PRODUCTS,
  MULTI_BRAND_FEATURED,
  NEW_ARRIVALS_PRODUCTS,
  PHONE_PARTS,
  getCategoryProducts,
  hrefForCartKey,
  type CatalogProduct,
} from "@/data/catalog";

export interface SearchHit {
  cartKey: string;
  name: string;
  subtitle?: string;
  href: string;
  imageSrc: string;
  /** Mock catalog numeric price (shown when logged in). */
  priceNumber?: number;
  /** Woo display price with currency symbol (shown when logged in). */
  priceText?: string | null;
}

let cached: SearchHit[] | null = null;

function fromProduct(p: CatalogProduct): SearchHit {
  return {
    cartKey: p.cartKey,
    name: p.name,
    subtitle: p.subtitle,
    href: hrefForCartKey(p.cartKey),
    imageSrc: p.img,
    priceNumber: p.price,
  };
}

export function buildSearchIndex(): SearchHit[] {
  if (cached) return cached;
  const products: CatalogProduct[] = [
    ...HOME_PRODUCTS,
    ...PHONE_PARTS,
    ...ACCESSORIES_PRODUCTS,
    ...CARDS_PRODUCTS,
    ...NEW_ARRIVALS_PRODUCTS,
    ...MULTI_BRAND_FEATURED,
    ...DEAL_PRODUCTS,
  ];
  for (const slug of Object.keys(allSlugs)) {
    products.push(...getCategoryProducts(slug));
  }
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const p of products) {
    if (seen.has(p.cartKey)) continue;
    seen.add(p.cartKey);
    hits.push(fromProduct(p));
  }
  cached = hits;
  return hits;
}

export function searchCatalog(query: string, limit = 10): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const index = buildSearchIndex();
  const scored: { hit: SearchHit; score: number }[] = [];
  for (const hit of index) {
    const name = hit.name.toLowerCase();
    const sub = (hit.subtitle ?? "").toLowerCase();
    let score = 0;
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 40;
    else if (name.includes(q)) score += 20;
    if (sub.includes(q)) score += 8;
    const words = q.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (w.length < 2) continue;
      if (name.includes(w)) score += 5;
      if (sub.includes(w)) score += 2;
    }
    if (score > 0) scored.push({ hit, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.hit);
}
