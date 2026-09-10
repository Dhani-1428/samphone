import { accessoriesColumns, cardsColumns, smartphonesColumns } from "@/data/categories";
import type { WooProduct } from "@/lib/woocommerce";
import { catalogUnitPrice, type PriceUser } from "@/lib/customer-price";

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
  return /\b(parts?|spare|replacement|screen|display|lcd|oled|digitizer|touch\s*panel|touch\s*\+\s*incell|incell|flex|volume\s*flex|volumeflex|power\s*flex|power\s*\+\s*volume\s*flex|power\s*\+\s*volumeflex|camera lens|camera module|rear camera|front camera|back camera|housing|battery for|ringer|buzzer|vibrat(?:or|er)|sim\s*(tray|reader)|sim\s*dream|charging port|charging board|charging flex|sub board|daughter board|connector|ic|mic|microphone sensor|earpiece|loudspeaker|back glass|motherboard|mainboard|logic board|board|pcb|fingerprint sensor|home button|action button|taptic)\b/i.test(
    name,
  );
}

function isSimTrayProduct(name: string): boolean {
  return /\bsim\s*tray\b/i.test(name);
}

function isLikelyAccessory(name: string): boolean {
  return /\b(back cover|cover|case|wallet case|flip cover|silicon soft jelly|jelly|magsafe|charger|charging cable|cable|adapter|earphone|headphone|earbuds?|headset|handsfree|tempered glass|protector|screen protector|camera protector|film|power bank|holder|mount|car charger|usb-c|type-c|lightning cable|speaker|glass|battery)\b/i.test(
    name,
  );
}

function isTabletSparePartName(name: string): boolean {
  const n = name ?? "";
  // Tablet digitizer/button spare parts often include model families + TOUCH/HOME BUTTON.
  return /\b(ipad|galaxy tab|samsung galaxy tab|lenovo tab|tb-x\d+|t\d{3}\/t\d{3}|a\d{4}\/a\d{4})\b/i.test(n) && /\b(touch|home button)\b/i.test(n);
}

function hasStorageRamPattern(name: string): boolean {
  return (
    /\b\d{1,3}\s*gb\s*\/\s*\d{1,4}\s*gb\b/i.test(name) ||
    /\b\d{1,3}\s*gb\s+\d{1,4}\s*gb\s*ram\b/i.test(name) ||
    /\b\d{1,3}\s*gb\s+\d{1,4}\s*gb\b/i.test(name)
  );
}

const TABLET_DEVICE_RE =
  /\b(tablet|ipad|galaxy\s*tab|matepad|mate\s*pad|mediapad|media\s*pad|lenovo\s*tab|xiaomi\s*pad|redmi\s*pad|honor\s*pad|honor\s*tab|tcl\s*tab|modio)\b/i;

function looksLikeTabletRetailName(name: string): boolean {
  return TABLET_DEVICE_RE.test(name);
}

function looksLikePhoneNotTablet(name: string): boolean {
  if (looksLikeTabletRetailName(name)) return false;
  return /\b(iphone|galaxy\s+[asmzn]\d|galaxy\s+z\s|redmi\s+note|pixel\s?\d|oneplus|motorola)\b/i.test(name);
}

function looksLikePhoneRetailName(name: string): boolean {
  return /\b(iphone|samsung|galaxy|oppo|xiaomi|redmi|poco|pixel|realme|huawei|oneplus|motorola|nokia|alcatel|tcl|zte|volfen|mobile phone)\b/i.test(
    name,
  );
}

function hasPhoneModelHint(name: string): boolean {
  return /\b(a\d{1,2}|s\d{1,2}|m\d{1,2}|note\s?\d{1,2}|mi\s?\d|p\d{1,2}|x\d{1,2}|fold|flip|pro|max|ultra|t\d{1,2}|a5x?)\b/i.test(
    name,
  );
}

function isOriginalDeviceName(name: string): boolean {
  const n = name ?? "";
  if (isLikelySparePart(n) || isSimTrayProduct(n) || isLikelyAccessory(n) || isTabletSparePartName(n)) return false;
  // Tablets often come with shorter titles in Woo (without full RAM/storage pair).
  if (looksLikeTabletRetailName(n)) return true;
  // Phones: allow retail-brand names even if RAM/storage is not in the title.
  if (!hasStorageRamPattern(n)) {
    if (looksLikePhoneRetailName(n)) return true;
    return hasPhoneModelHint(n);
  }
  if (looksLikePhoneRetailName(n)) return true;
  return hasPhoneModelHint(n);
}

function isRetailDeviceCandidate(p: WooProduct): boolean {
  const name = p.name ?? "";
  if (isAccessoryOrCardsOnlyProduct(p)) return false;
  if (isLikelySparePart(name)) return false;
  if (isSimTrayProduct(name)) return false;
  if (isLikelyAccessory(name)) return false;
  if (isTabletSparePartName(name)) return false;
  if (
    p.categories?.some((c) =>
      /\b(parts?|spare|replacement|repair|screen|display|camera|charger|cable|cover|case|battery|accessor|protector|glass)\b/i.test(
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
  if (/tablet|ipad|galaxy-?tab|galaxytab|mate-?pad|xiaomi-?pad|redmi-?pad|lenovo-?tab|honor-?pad|tcl-?tab|mediapad/i.test(s)) return true;
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
  if (/\bsmartphone\b|\bmobile phone\b/i.test(n) && (hasStorageRamPattern(n) || hasPhoneModelHint(n))) return true;
  if (/\d+\s*gb\s*\/\s*\d+/i.test(n) && looksLikePhoneRetailName(n)) return true;
  return /\b(iphone\s|galaxy\s+[asn]\d|galaxy\s+z\s|oppo\s+[ar]\d|xiaomi|redmi|poco|pixel\s?\d|realme|huawei\s+p?\d|oneplus|motorola|nokia)/i.test(
    n,
  );
}

export function filterSmartphoneParts(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => matchesSlugSet(p, SMARTPHONE_CATEGORY_SLUGS));
}

function inSmartphonesCategory(p: WooProduct): boolean {
  return (
    p.categories?.some((c) => c.slug === "smartphones" || /^smartphones$/i.test(c.name)) ?? false
  );
}

export function filterPhoneParts(products: WooProduct[]): WooProduct[] {
  const out = products.filter((p) => {
    const name = p.name ?? "";
    if (isTabletLikeProduct(p) || looksLikeTabletRetailName(name)) return false;
    if (inSmartphonesCategory(p)) return true;
    if (!isRetailDeviceCandidate(p)) return false;
    if (hasStorageRamPattern(name) && looksLikePhoneRetailName(name)) return true;
    if (
      matchesSlugSet(p, ALL_PHONE_CATEGORY_SLUGS) &&
      looksLikePhoneRetailName(name) &&
      (hasStorageRamPattern(name) || hasPhoneModelHint(name))
    ) {
      return true;
    }
    return looksLikeRetailSmartphoneTitle(name);
  });
  if (out.length > 0) return out;
  return sortNewest(
    products.filter((p) => isRetailDeviceCandidate(p) && !isTabletLikeProduct(p) && !looksLikeTabletRetailName(p.name ?? "")),
  );
}

export function filterTabletParts(products: WooProduct[]): WooProduct[] {
  return products.filter((p) => {
    const name = p.name ?? "";
    const group = `${p.catalogGroup ?? ""} ${p.subcategory ?? ""} ${p.modelLabel ?? ""}`;
    if (looksLikePhoneNotTablet(name) && !looksLikeTabletRetailName(group)) return false;
    if (looksLikeTabletRetailName(name) || looksLikeTabletRetailName(group)) return true;
    if (isTabletLikeProduct(p) && !looksLikePhoneNotTablet(name)) return true;
    return false;
  });
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

/** Escape a string for use inside a RegExp. */
function escapeRegExpToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match one search token against catalog text.
 * Digits like "17" hit "17e" and "17 Pro Max", but not "117" or "170".
 */
export function searchTokenMatchesText(haystack: string, token: string): boolean {
  const hay = haystack.toLowerCase();
  const tok = token.trim().toLowerCase();
  if (!tok) return true;
  if (/^\d{1,4}$/.test(tok)) {
    return new RegExp(`(?:^|[^0-9])${escapeRegExpToken(tok)}(?:[^0-9]|$)`).test(hay);
  }
  return hay.includes(tok);
}

/** Every query token must appear in the haystack (generation-aware). */
export function textMatchesSearchQuery(haystack: string, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((tok) => searchTokenMatchesText(hay, tok));
}

export function productMatchesSearchQuery(p: WooProduct, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return textMatchesSearchQuery(productSearchHaystack(p), q) || textMatchesSearchQuery(p.name ?? "", q);
}

/** Search text used to decide which brand a catalog product belongs to. */
export function productSearchHaystack(p: WooProduct): string {
  return [
    p.name,
    p.slug,
    p.sku,
    p.brand,
    p.catalogGroup,
    p.subcategory,
    p.modelLabel,
    p.partType,
    ...(p.categories ?? []).flatMap((c) => [c.name, c.slug]),
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ")
    .toLowerCase();
}

const APPLE_BRAND_NEEDLES = [
  "iphone",
  "ipad",
  "iwatch",
  "apple watch",
  "macbook",
  "airpods",
  "airpod",
  "ipod",
  "imac",
  "apple",
];

const BRAND_NEEDLES: Record<string, string[]> = {
  apple: APPLE_BRAND_NEEDLES,
  iphone: APPLE_BRAND_NEEDLES,
  samsung: ["samsung", "galaxy"],
  honor: ["honor"],
  xiaomi: ["xiaomi", "redmi", "poco", "mi pad", "xiaomi pad"],
  huawei: ["huawei", "matepad", "mate pad", "mediapad", "media pad"],
  motorola: ["motorola", "moto g", "moto e", "moto edge", "razr", "thinkphone"],
  oneplus: ["oneplus", "one plus", "nord"],
  oppo: ["oppo"],
  realme: ["realme"],
  vivo: ["vivo"],
  nokia: ["nokia"],
  google: ["google pixel", "pixel"],
  alcatel: ["alcatel"],
  tcl: ["tcl"],
  zte: ["zte"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function haystackHasNeedle(hay: string, needle: string): boolean {
  const n = needle.toLowerCase().trim();
  if (!n) return false;
  if (n.includes(" ")) return hay.includes(n);
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(n)}(?:[^a-z0-9]|$)`).test(hay);
}

export function brandKeywordNeedles(brandLabel: string): string[] {
  const raw = brandLabel
    .toLowerCase()
    .replace(/\s+parts$/i, "")
    .replace(/-/g, " ")
    .trim();
  if (!raw) return [];
  const compact = raw.replace(/\s+/g, "");
  return BRAND_NEEDLES[raw] ?? BRAND_NEEDLES[compact] ?? [raw];
}

/** Narrow by brand tile keyword. Never falls back to the full catalog. */
export function filterProductsByBrandKeyword(
  products: WooProduct[],
  brandLabel: string | null,
  limit?: number,
): WooProduct[] {
  let list = sortNewest(products);
  if (brandLabel) {
    const needles = brandKeywordNeedles(brandLabel);
    if (needles.length) {
      list = list.filter((p) => {
        const hay = productSearchHaystack(p);
        return needles.some((n) => haystackHasNeedle(hay, n));
      });
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

export function pickHomeFeatured(
  products: WooProduct[],
  limit: number,
  offset = 0,
  excludeIds?: Set<number>,
): WooProduct[] {
  const sorted = sortNewest(products);
  const filtered = excludeIds ? sorted.filter((p) => !excludeIds.has(p.id)) : sorted;
  return filtered.slice(offset, offset + limit);
}

const SECTION_TITLE_NEEDLES: Record<string, string[]> = {
  "repair tools": ["repair tool", "repairing tool", "screwdriver", "spudger", "opening tool", "suction cup", "tweezer"],
  "memory cards": ["memory card", "sd card", "microsd", "micro sd", "tf card", "sdhc", "sdxc"],
  adapters: ["adapter", "adaptor"],
  "mobile car support": ["car support", "car mount", "car holder", "car stand", "dashboard mount", "vent mount"],
  "magsafe covers": ["magsafe cover", "magsafe case", "mag safe cover", "mag safe case", "magsafe"],
  "wireless headsets": ["wireless headset", "bluetooth headset", "wireless earphone", "bluetooth earphone", "tws", "wireless earbuds"],
  "power bank": ["powerbank", "power bank"],
  cables: ["cable", "usb-c", "lightning cable", "type-c"],
  "screen protectors": ["screen protector", "tempered glass", "full glue", "glass protector"],
  "phone cases": ["phone case", "back cover", "flip cover", "silicon case", "silicone case"],
  chargers: ["charger", "wall charger", "fast charger"],
};

function sectionTitleNeedles(title: string): string[] {
  const key = title.toLowerCase().replace(/\s+/g, " ").trim();
  const extra = SECTION_TITLE_NEEDLES[key] ?? SECTION_TITLE_NEEDLES[key.replace(/s$/, "")] ?? [];
  return extra.length ? extra : key ? [key] : [];
}

const LCD_DISPLAY_PART =
  /\b(lcd|oled|incell|tft|digitizer|display|screen\s*assembly|touch\s*\+|touch\s*panel|service\s*pack|replacement\s*screen)\b/i;
const FLEX_OR_PORT_PART =
  /\b(flex(\s*cable)?|volume\s*flex|power\s*flex|charging\s*(port|board|flex)|sub\s*board|daughter\s*board)\b/i;
const HOUSING_PART = /\b(housing|middle\s*frame|chassis|bezel)\b/i;

export type HomeRailKey =
  | "repair-tools"
  | "memory-cards"
  | "adapters"
  | "car-support"
  | "magsafe-covers"
  | "wireless-headsets"
  | "power-bank"
  | "cables"
  | "screen-protectors"
  | "phone-cases"
  | "chargers";

const TITLE_TO_RAIL: Record<string, HomeRailKey> = {
  "repair tools": "repair-tools",
  "memory cards": "memory-cards",
  adapters: "adapters",
  "mobile car support": "car-support",
  "magsafe covers": "magsafe-covers",
  "wireless headsets": "wireless-headsets",
  headphones: "wireless-headsets",
  "power bank": "power-bank",
  cables: "cables",
  "screen protectors": "screen-protectors",
  "phone cases": "phone-cases",
  chargers: "chargers",
};

/** True when a product belongs on a homepage accessory rail (never LCD/display parts in glass). */
export function productMatchesHomeRail(p: WooProduct, key: HomeRailKey): boolean {
  const hay = productSearchHaystack(p);
  switch (key) {
    case "screen-protectors":
      return (
        /\b(tempered(\s*glass)?|privacy\s*glass|full\s*glue|screen\s*protect|glass\s*protect|normal\s*glass|curved\s*glass|vidro\s*templado|pel[ií]cula)\b/i.test(
          hay,
        ) && !LCD_DISPLAY_PART.test(hay)
      );
    case "phone-cases":
      return (
        /\b(phone\s*case|back\s*cover|flip\s*cover|silicon(e)?\s*(soft\s*)?(jelly|case|cover)|jelly|magsafe\s*(cover|case)|wallet\s*case|funda|capa)\b/i.test(
          hay,
        ) &&
        !LCD_DISPLAY_PART.test(hay) &&
        !HOUSING_PART.test(hay) &&
        !/\b(back\s*glass|rear\s*glass)\b/i.test(hay)
      );
    case "magsafe-covers":
      return /\bmagsafe\b/i.test(hay) && /\b(cover|case|funda|capa)\b/i.test(hay) && !/\bcharg/i.test(hay);
    case "chargers":
      return (
        /\b(wall\s*charg|fast\s*charg|charger|carregador|adaptador|pd\s*\d{2,3}w|gan\s*charg)\b/i.test(hay) &&
        !FLEX_OR_PORT_PART.test(hay) &&
        !/\bcharging\s*case\b/i.test(hay)
      );
    case "adapters":
      return /\b(adapter|adaptor|adaptador)\b/i.test(hay) && !FLEX_OR_PORT_PART.test(hay) && !LCD_DISPLAY_PART.test(hay);
    case "cables":
      return (
        /\b((usb[-\s]*c|lightning|hdmi|type[-\s]*c|micro\s*usb)\s*(cable|cabo)|data\s*cable|charging\s*cable|\bcables?\b|\bcabos?\b)\b/i.test(
          hay,
        ) &&
        !FLEX_OR_PORT_PART.test(hay) &&
        !/\b(tempered|privacy\s*glass|full\s*glue|screen\s*protect|back\s*cover|wallet\s*case|phone\s*case|jelly)\b/i.test(
          hay,
        )
      );
    case "power-bank":
      return /\b(power\s*bank|powerbank|carregador\s*port[aá]til)\b/i.test(hay) && !/\bbattery\s*for\b/i.test(hay);
    case "wireless-headsets": {
      if (/\bheadphone\s*jack\b/i.test(hay)) return false;
      const fromGroup = /\b(headphones?|earphones?|headset|audio)\b/i.test(
        `${p.catalogGroup ?? ""} ${p.subcategory ?? ""} ${(p.categories ?? []).map((c) => `${c.name} ${c.slug}`).join(" ")}`,
      );
      const fromTitle =
        /\b(headphones?|earphones?|headsets?|earbuds?|airpods?|\btws\b|fones?(?:\s+de\s+ouvido)?|auriculares?|auscultadores?|neck\s*earphone|bluetooth\s*(headset|earphones?|headphones?)|wireless\s*(headset|earphones?|headphones?))\b/i.test(
          hay,
        );
      return fromGroup || fromTitle;
    }
    case "car-support":
      return /\b(car\s*(support|mount|holder|stand|charger)|dashboard\s*mount|vent\s*mount)\b/i.test(hay);
    case "memory-cards":
      return /\b(memory\s*card|micro\s*sd|microsd|sd\s*card|tf\s*card|sdhc|sdxc)\b/i.test(hay);
    case "repair-tools":
      return (
        /\b(repair(ing)?\s*tool|screwdriver|spudger|opening\s*tool|suction\s*cup|tweezer|pry\s*tool|iflx|mechanic\s*tool)\b/i.test(
          hay,
        ) && !LCD_DISPLAY_PART.test(hay)
      );
    default:
      return false;
  }
}

export function pickHomeRailItems(products: WooProduct[], key: HomeRailKey, limit = 14): WooProduct[] {
  const out: WooProduct[] = [];
  const seen = new Set<number>();
  for (const p of products) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    if (!productMatchesHomeRail(p, key)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** Keep only products that match a homepage rail title (Chargers, Hoco, …). */
export function filterProductsMatchingTitle(
  products: WooProduct[],
  title: string,
  limit = 14,
): WooProduct[] {
  const rail = TITLE_TO_RAIL[title.toLowerCase().replace(/\s+/g, " ").trim()];
  if (rail) return pickHomeRailItems(products, rail, limit);
  const needles = sectionTitleNeedles(title);
  if (!needles.length) return [];
  const out: WooProduct[] = [];
  const seen = new Set<number>();
  for (const p of products) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    const hay = productSearchHaystack(p);
    if (!needles.some((n) => hay.includes(n) || haystackHasNeedle(hay, n))) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
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

export function sortByPrice(products: WooProduct[], order: "asc" | "desc", user?: PriceUser): WooProduct[] {
  return [...products].sort((a, b) => {
    const pa = catalogUnitPrice(a, user);
    const pb = catalogUnitPrice(b, user);
    const na = pa ?? Infinity;
    const nb = pb ?? Infinity;
    return order === "asc" ? na - nb : nb - na;
  });
}
