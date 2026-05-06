import { accessoriesColumns, cardsColumns, smartphonesColumns } from "@/data/categories";
import type { WooProduct } from "@/lib/woocommerce";

const TABLETS_SLUG = "tablets";
const SMARTPHONE_CATEGORY_SLUGS = new Set(smartphonesColumns.flatMap((c) => c.items.map((i) => i.slug)));
/** Phone repair categories only (excludes the tablets Woo category). */
export const PHONE_CATEGORY_SLUGS = new Set(
  [...SMARTPHONE_CATEGORY_SLUGS].filter((s) => s !== TABLETS_SLUG),
);
const ACCESSORY_CATEGORY_SLUGS = new Set(accessoriesColumns.flatMap((c) => c.items.map((i) => i.slug)));
const CARD_CATEGORY_SLUGS = new Set(cardsColumns.flatMap((c) => c.items.map((i) => i.slug)));

/** Common Woo slugs for retail phones (devices), merged with repair-part slugs from `PHONE_CATEGORY_SLUGS`. */
const DEFAULT_RETAIL_PHONE_SLUGS = [
  "smartphones",
  "mobile-phones",
  "cell-phones",
  "celulares",
  "telemoveis",
  "telefone-movel",
  "telefone-móvel",
  "phones",
  "mobiles",
] as const;

function parseCommaSlugs(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

const EXTRA_PHONE_SLUGS = parseCommaSlugs(import.meta.env.VITE_WOO_EXTRA_PHONE_CATEGORY_SLUGS as string | undefined);
const EXTRA_TABLET_SLUGS = parseCommaSlugs(import.meta.env.VITE_WOO_EXTRA_TABLET_CATEGORY_SLUGS as string | undefined);

function buildAllPhoneSlugs(): Set<string> {
  const s = new Set<string>(PHONE_CATEGORY_SLUGS);
  for (const x of DEFAULT_RETAIL_PHONE_SLUGS) s.add(x);
  for (const x of EXTRA_PHONE_SLUGS) s.add(x);
  return s;
}

const ALL_PHONE_CATEGORY_SLUGS = buildAllPhoneSlugs();

const MULTI_BRAND_NAMES = ["Hoco", "Baseus", "Anker", "Ugreen", "Joyroom", "WK Design", "WK"];

function matchesSlugSet(p: WooProduct, slugs: Set<string>): boolean {
  return p.categories?.some((c) => slugs.has(c.slug)) ?? false;
}

function isAccessoryOrCardsOnlyProduct(p: WooProduct): boolean {
  const cats = p.categories ?? [];
  if (cats.length === 0) return false;
  return cats.every(
    (c) => ACCESSORY_CATEGORY_SLUGS.has(c.slug) || CARD_CATEGORY_SLUGS.has(c.slug),
  );
}

function baseDeviceProducts(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => !isAccessoryOrCardsOnlyProduct(p));
}

function isLikelySparePart(name: string): boolean {
  return /\b(parts?|spare|replacement|screen|display|lcd|oled|digitizer|touch\s*panel|flex|camera lens|camera module|rear camera|front camera|back camera|housing|battery for|ringer|buzzer|vibrator|charging port|charging board|charging flex|sub board|daughter board|connector|ic|mic|speaker|back glass|motherboard|board|pcb|fingerprint sensor|volume flex|power flex|action button)\b/i.test(
    name,
  );
}

function isSimTrayProduct(name: string): boolean {
  return /\bsim\s*tray\b/i.test(name);
}

function isLikelyAccessory(name: string): boolean {
  return /\b(back cover|cover|case|wallet case|flip cover|magsafe|charger|charging cable|cable|adapter|earphone|headphone|speaker|glass|screen protector|camera lens|battery)\b/i.test(
    name,
  );
}

function hasStorageRamPattern(name: string): boolean {
  return /\b\d{1,3}\s*gb\s*\/\s*\d{1,4}\s*gb\b/i.test(name);
}

function looksLikeTabletRetailName(name: string): boolean {
  return /\b(tablet|ipad|galaxy tab|matepad|lenovo tab|xiaomi pad|modio)\b/i.test(name);
}

function looksLikePhoneRetailName(name: string): boolean {
  return /\b(iphone|samsung|galaxy|oppo|xiaomi|redmi|poco|pixel|realme|huawei|oneplus|motorola|nokia|alcatel)\b/i.test(name);
}

function hasPhoneModelHint(name: string): boolean {
  return /\b(a\d{1,2}|s\d{1,2}|m\d{1,2}|note\s?\d{1,2}|mi\s?\d|p\d{1,2}|x\d{1,2}|fold|flip|pro|max|ultra|t\d{1,2}|a5x?)\b/i.test(
    name,
  );
}

function isOriginalDeviceName(name: string): boolean {
  const n = name ?? "";
  if (isLikelySparePart(n) || isSimTrayProduct(n) || isLikelyAccessory(n)) return false;
  // Tablets: accept branded tablet rows, with or without RAM/storage in title.
  if (looksLikeTabletRetailName(n)) return true;
  // Phones: accept branded/model rows; part/accessory names are already excluded above.
  if (looksLikePhoneRetailName(n)) return true;
  // Generic fallback for retail rows that carry explicit RAM/storage + model hint.
  return hasStorageRamPattern(n) && hasPhoneModelHint(n);
}

function isRetailDeviceCandidate(p: WooProduct): boolean {
  const name = p.name ?? "";
  if (isAccessoryOrCardsOnlyProduct(p)) return false;
  if (isLikelySparePart(name)) return false;
  if (isSimTrayProduct(name)) return false;
  if (isLikelyAccessory(name)) return false;
  if (
    p.categories?.some((c) =>
      /\b(parts?|spare|replacement|repair|screen|display|camera|charger|cable|cover|case|battery)\b/i.test(
        `${c.slug} ${c.name}`,
      ),
    )
  ) {
    return false;
  }
  return isOriginalDeviceName(name);
}

function categorySlugLooksTablet(slug: string): boolean {
  const s = slug.toLowerCase();
  if (s === TABLETS_SLUG) return true;
  for (const x of EXTRA_TABLET_SLUGS) {
    if (s === x) return true;
  }
  if (/tablet|ipad|galaxy-tab|galaxytab|mate-?pad|surface-go|tab-/i.test(s)) return true;
  return false;
}

function categoryNameLooksTablet(name: string): boolean {
  return /\btablet\b|ipad\b|galaxy tab|matepad|mate pad|surfac/i.test(name);
}

/** True when the product should appear under the Tablets tab (retail devices, not spare parts). */
export function isTabletLikeProduct(p: WooProduct): boolean {
  if (p.categories?.some((c) => categorySlugLooksTablet(c.slug) || categoryNameLooksTablet(c.name))) return true;
  if (/\btablet\b/i.test(p.name)) return true;
  return false;
}

/** Retail-looking phone title when Woo categories are missing or use generic slugs. */
function looksLikeRetailSmartphoneTitle(name: string): boolean {
  const n = name.toLowerCase();
  if (/\btablet\b/.test(n)) return false;
  if (/\b(screen|lcd|oled display only|replacement glass|flex cable|battery for|housing|digitizer only)\b/i.test(n)) {
    return false;
  }
  if (/\d+\s*gb\s*\/\s*\d+/i.test(n)) return true;
  return /\b(iphone\s|galaxy\s+[asn]\d|galaxy\s+z\s|oppo\s+[ar]\d|xiaomi|redmi|poco|pixel\s?\d|realme|huawei\s+p?\d|oneplus|motorola|nokia)/i.test(
    n,
  );
}

export function filterSmartphoneParts(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => matchesSlugSet(p, SMARTPHONE_CATEGORY_SLUGS));
}

export function filterPhoneParts(products: WooProduct[]): WooProduct[] {
  const out = products.filter((p) => {
    const name = p.name ?? "";
    if (!isRetailDeviceCandidate(p)) return false;
    if (isTabletLikeProduct(p) || looksLikeTabletRetailName(name)) return false;
    // Accept clearly retail-like phone rows from API.
    if (hasStorageRamPattern(name) && looksLikePhoneRetailName(name)) return true;
    if (matchesSlugSet(p, ALL_PHONE_CATEGORY_SLUGS)) return true;
    return looksLikeRetailSmartphoneTitle(name);
  });
  if (out.length > 0) return out;
  // Fallback for stores with generic categories: still keep strict retail-device candidates only.
  return sortNewest(
    products.filter((p) => isRetailDeviceCandidate(p) && !isTabletLikeProduct(p) && !looksLikeTabletRetailName(p.name ?? "")),
  );
}

export function filterTabletParts(products: WooProduct[]): WooProduct[] {
  const out = products.filter((p) => {
    const name = p.name ?? "";
    if (!isRetailDeviceCandidate(p)) return false;
    // Accept tablet-like names/categories and common retail rows with RAM/storage notation.
    if (looksLikeTabletRetailName(name)) return true;
    if (isTabletLikeProduct(p) && hasStorageRamPattern(name)) return true;
    return isTabletLikeProduct(p);
  });
  if (out.length > 0) return out;
  // Fallback for stores where tablets are in generic categories.
  return baseDeviceProducts(products).filter((p) =>
    /\b(tablet|tab|ipad|matepad|xiaomi pad|lenovo tab|galaxy tab|modio)\b/i.test(p.name),
  );
}

/** Keep only products that belong on the Smartphones page tab (phones vs tablets). */
export function filterCatalogForSmartphonesTab(
  products: WooProduct[],
  section: "phones" | "tablets",
): WooProduct[] {
  const out = section === "tablets" ? filterTabletParts(products) : filterPhoneParts(products);
  if (out.length > 0) return out;
  // Do not fall back to broad lists; keep the smartphones page free of parts/accessories.
  return [];
}

/** Narrow by brand tile keyword (same rules as the catalog brand chips). */
export function filterProductsByBrandKeyword(
  products: WooProduct[],
  brandLabel: string | null,
  limit?: number,
): WooProduct[] {
  let list = sortNewest(products);
  if (brandLabel) {
    const kw = brandLabel.toLowerCase().replace(/\s+parts$/i, "").trim();
    if (kw) {
      const sub = list.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          (p.categories?.some((c) => c.slug.includes(kw) || c.name.toLowerCase().includes(kw)) ?? false),
      );
      list = sub.length ? sub : list;
    }
  }
  return limit != null && limit > 0 ? list.slice(0, limit) : list;
}

function filterSectionBrand(
  products: WooProduct[],
  section: "phones" | "tablets",
  brandLabel: string | null,
  limit?: number,
): WooProduct[] {
  const base = section === "tablets" ? filterTabletParts(products) : filterPhoneParts(products);
  return filterProductsByBrandKeyword(base, brandLabel, limit);
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

export function filterSmartphoneBrand(
  products: WooProduct[],
  brandLabel: string | null,
  limit?: number,
): WooProduct[] {
  return filterSectionBrand(products, "phones", brandLabel, limit);
}

export function filterTabletBrand(products: WooProduct[], brandLabel: string | null, limit?: number): WooProduct[] {
  return filterSectionBrand(products, "tablets", brandLabel, limit);
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
