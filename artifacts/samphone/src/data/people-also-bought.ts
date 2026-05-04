import {
  HOME_PRODUCTS,
  PHONE_PARTS,
  ACCESSORIES_PRODUCTS,
  resolveCatalogProduct,
  type CatalogProduct,
} from "@/data/catalog";

const RELATED: Record<string, string[]> = {
  "phones:1": ["phones:3", "acc:1", "home:1"],
  "phones:2": ["phones:5", "acc:2", "home:3"],
  "phones:3": ["phones:6", "acc:8", "cards:5"],
  "home:1": ["acc:3", "acc:5", "phones:1"],
  "acc:6": ["acc:8", "acc:9", "home:2"],
  "new:1": ["new:2", "acc:1", "home:1"],
  "deal:1": ["phones:1", "acc:1", "home:3"],
};

function scopePool(scope: string): CatalogProduct[] {
  switch (scope) {
    case "phones":
      return [...PHONE_PARTS];
    case "acc":
      return [...ACCESSORIES_PRODUCTS];
    case "home":
      return [...HOME_PRODUCTS];
    default:
      return [...HOME_PRODUCTS, ...ACCESSORIES_PRODUCTS].slice(0, 12);
  }
}

/** Up to 4 related cart keys for product detail cross-sell. */
export function getPeopleAlsoBoughtKeys(cartKey: string, limit = 4): string[] {
  const direct = RELATED[cartKey];
  if (direct?.length) return direct.slice(0, limit);
  const scope = cartKey.split(":")[0] ?? "home";
  const pool = scopePool(scope).filter((p) => p.cartKey !== cartKey);
  return pool.slice(0, limit).map((p) => p.cartKey);
}

export function getPeopleAlsoBoughtProducts(cartKey: string, limit = 4): CatalogProduct[] {
  return getPeopleAlsoBoughtKeys(cartKey, limit)
    .map((k) => resolveCatalogProduct(k))
    .filter((p): p is CatalogProduct => p != null);
}
