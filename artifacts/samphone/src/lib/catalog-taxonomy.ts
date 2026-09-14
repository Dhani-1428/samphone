/** Minimal product shape used by taxonomy + search tests (WooProduct is compatible). */
import type { AccessoriesSubcategory as BrowseAcc, PartsSubcategory as BrowsePart, TopCategory } from "./product-taxonomy.ts";

export type TaxonomyProduct = {
  name: string;
  partType?: string;
  catalogGroup?: string;
  subcategory?: string;
  specs?: Record<string, string>;
  categories?: { name: string }[];
};

/** Top-level catalog split on model pages. */
export type CatalogTopCategory = "parts" | "accessories";

export type PartsSubcategory =
  | "screen"
  | "battery"
  | "charging-port"
  | "camera"
  | "speaker"
  | "flex-cable"
  | "housing"
  | "other-parts";

export type AccessoriesSubcategory =
  | "case"
  | "back-cover"
  | "screen-protector"
  | "charger"
  | "cable"
  | "earphones"
  | "device"
  | "other-accessories";

export type CatalogSubcategory = PartsSubcategory | AccessoriesSubcategory;

export type CatalogClassification = {
  category: CatalogTopCategory;
  subcategory: CatalogSubcategory;
  browseTop: TopCategory;
  browseSub: BrowsePart | BrowseAcc;
  /** Existing model-page chip id. */
  typeId: string;
  issues: string[];
};

const PART_SUBS = new Set<string>([
  "screen",
  "battery",
  "charging-port",
  "camera",
  "speaker",
  "flex-cable",
  "housing",
  "other-parts",
]);

const ACC_SUBS = new Set<string>([
  "case",
  "back-cover",
  "screen-protector",
  "charger",
  "cable",
  "earphones",
  "device",
  "other-accessories",
]);

function nameHay(p: TaxonomyProduct): string {
  return (p.name || "").toLowerCase();
}

function hay(p: TaxonomyProduct): string {
  return [
    p.name,
    p.partType,
    p.catalogGroup,
    p.subcategory,
    p.specs?.Type,
    ...(p.categories ?? []).map((c) => c.name),
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ")
    .toLowerCase();
}

const ACCESSORY_RE =
  /\b(jelly|silicone?|magsafe|tempered|full glue|privacy glass|screen protect|protector|wallet|flip cover|antishock|popsocket|holder|earphones?|headset|earbuds|tws|charger|carregador|adaptador|wall charg|power bank|usb-c cable|lightning cable|data cable|capa|capas|capinha|funda|tampas?|covers?|cases?|design cover|soft jelly|back cover|rear cover|pel[ií]cula)\b/i;

/** Internal repair hardware — never an accessory, even if the title starts with a phone model. */
const PART_RE =
  /\b(touch\s*\+|lcd|oled|incell|tft|digitizer|service pack|display assembly|replacement screen|\bscreen\b|\bbattery\b|front camera|rear camera|back camera|camera module|charging (flex|port|board)|charge flex|usb flex|dock flex|sim tray|sim reader|housing|chassis|middle frame|buzzer|ringer|vibrat(?:or|er|ion)|taptic|earpiece|ear[\s-]?speaker|loud[\s-]?speaker|\bspeaker\b|flashlight|flash[\s-]?light|flash (?:flex|lamp)|motherboard|logic board|mainboard|back glass|rear glass|(?:main|volume|power|antenna|fingerprint|finger)\s*flex|\bflex\b|proximity|\bmic\b|microphone|peças?)\b/i;

const AUDIO_ACCESSORY_RE =
  /\b(bluetooth\s*speaker|bt\s*speaker|portable\s*speaker|soundbar|earphones?|headset|earbuds|\btws\b|handsfree|neck earphone)\b/i;

const ACCESSORY_GROUP_RE = /original accessor|\baccessories\b|\bhoco\b|charger|cables?|headphone|power ?bank|\bcards\b/i;
const PART_GROUP_RE = /phone part|peças?|pecas?|spare part/i;
const DEVICE_GROUP_RE = /\b(smartphones?|telem[oó]veis|mobile phones?|cell phones?)\b/i;

function isPartName(n: string): boolean {
  if (/\b(tempered|protector|full glue|privacy glass|pel[ií]cula|jelly|silicone?|magsafe)\b/i.test(n) && !/\b(lcd|oled|flex|housing|battery)\b/i.test(n)) {
    return false;
  }
  if (/\b(cover|case|capa|capinha)\b/i.test(n) && !/\b(back glass|rear glass|lcd|oled|housing|flex)\b/i.test(n)) return false;
  if (/\bscreen\b/i.test(n) && /\bprotect/i.test(n)) return false;
  if (/\bpower bank\b/i.test(n)) return false;
  if (AUDIO_ACCESSORY_RE.test(n) && !/\b(ear[\s-]?speaker|earpiece|loud[\s-]?speaker)\b/i.test(n)) return false;
  return PART_RE.test(n) || /\b(housing|chassis)\b/i.test(n) || (/\bframe\b/i.test(n) && !/\b(case|cover|bumper)\b/i.test(n));
}

/**
 * Complete phones / tablets / watches sold as-is (not a spare part or case).
 */
export function looksLikeFinishedDevice(name: string, extraHay = ""): boolean {
  const h = `${name} ${extraHay}`.toLowerCase();
  if (isPartName(h) || PART_RE.test(h)) return false;
  if (/\b(cover|case|jelly|capa|capinha|funda|tempered|protector|full glue|privacy glass|charger|carregador|cable|cabo|earphone|headset|earbuds|tws|power bank)\b/i.test(h)) {
    return false;
  }
  if (/\b(sd|microsd|micro-sd|memory card|tf card|pendrive)\b/i.test(h)) return false;
  if (DEVICE_GROUP_RE.test(h) && !PART_GROUP_RE.test(h) && !PART_RE.test(h)) return true;
  if (!/\b(iphone|ipad|apple watch|iwatch|galaxy|pixel|redmi|poco|xiaomi|oppo|realme|huawei|honor|motorola|oneplus|nokia|vivo|alcatel|smartphone|telem[oó]vel|mobile phone|tablet)\b/i.test(h)) {
    return false;
  }
  return !PART_RE.test(h);
}

function isAccessoryName(n: string): boolean {
  if (isPartName(n) && !/\b(jelly|silicone?|magsafe|tempered|protector|full glue|privacy glass|case|cover|capa|capinha|charger|earphones?)\b/i.test(n)) {
    return false;
  }
  if (!ACCESSORY_RE.test(n)) return false;
  if (/\b(tempered|protector|full glue|privacy|pel[ií]cula|jelly|silicone?|magsafe|case|cover|capa|capinha)\b/i.test(n)) {
    if (/\b(lcd|oled|incell|digitizer|service pack|flex|ear[\s-]?speaker)\b/i.test(n)) return false;
    return true;
  }
  if (/\b(charging (port|flex|board)|housing|chassis|back glass|rear glass|\bflex\b|ear[\s-]?speaker|vibrat)\b/i.test(n)) {
    return false;
  }
  return true;
}

function accessorySub(h: string): AccessoriesSubcategory {
  if (looksLikeFinishedDevice(h)) return "device";
  if (/\b(tempered|privacy glass|full glue|screen protect|normal glass|curved glass|pel[ií]cula|vidro templado)\b/i.test(h) && !/\b(lcd|oled|digitizer)\b/i.test(h)) {
    return "screen-protector";
  }
  if (/\b(jelly|silicone?\s*(soft)?|soft jelly|antishock|magsafe\s*(cover|case)|flip (cover|case)|wallet|design (cover|case)|phone case|tpu case)\b/i.test(h)) {
    return "case";
  }
  if (/\b(back cover|rear cover|tampa|cover)\b/i.test(h) && !/\b(lcd|oled|back glass|flex)\b/i.test(h)) {
    return "back-cover";
  }
  if (/\b(charger|carregador|adaptador|wall charg|gan charg|pd\s*\d{2,3}w)\b/i.test(h) && !/\bcharging\s*(port|flex|board)\b/i.test(h)) {
    return "charger";
  }
  if (/\b(usb[-\s]*c|lightning|hdmi|micro usb|data cable|charging cable|\bcable\b|\bcabo\b)\b/i.test(h) && !/\bflex\b/i.test(h)) {
    return "cable";
  }
  if (/\b(earphone|headset|earbuds|tws|auscult|handsfree|neck earphone)\b/i.test(h)) {
    return "earphones";
  }
  return "other-accessories";
}

function partSub(h: string): PartsSubcategory {
  if (/\b(touch\s*\+|lcd|oled|incell|digitizer|service pack|display)\b/i.test(h) && !/\b(tempered|protector|full glue)\b/i.test(h)) {
    return "screen";
  }
  if (/\bbattery\b/i.test(h) && !/\bpower bank\b/i.test(h)) return "battery";
  if (/\b(charging (port|flex|board)|charge flex|usb flex)\b/i.test(h)) return "charging-port";
  if (/\b(front camera|rear camera|back camera|camera lens)\b/i.test(h) && !/\b(3[\s-]*in[\s-]*1|complete|protect)\b/i.test(h)) {
    return "camera";
  }
  if (/\b(earpiece|ear[\s-]?speaker|loud[\s-]?speaker|buzzer|ringer|vibrat(?:or|er)|taptic|\bspeaker\b)\b/i.test(h) && !AUDIO_ACCESSORY_RE.test(h)) {
    return "speaker";
  }
  if (/\b(flex|volume flex|power flex|main flex|side button)\b/i.test(h)) return "flex-cable";
  if (/\b(housing|chassis)\b/i.test(h) || (/\bframe\b/i.test(h) && !/\b(case|cover|bumper)\b/i.test(h))) {
    return "housing";
  }
  return "other-parts";
}

function browseSubFor(category: CatalogTopCategory, subcategory: CatalogSubcategory, h: string): BrowsePart | BrowseAcc {
  if (category === "parts") {
    if (subcategory === "screen") return "screens";
    if (subcategory === "battery") return "batteries";
    if (subcategory === "charging-port") return "charging-ports";
    if (subcategory === "camera") return "cameras";
    if (subcategory === "housing") return "housing";
    return "small-components";
  }
  if (subcategory === "screen-protector") return "screen-protectors";
  if (subcategory === "case" || subcategory === "back-cover") return "cases";
  if (subcategory === "charger" || subcategory === "cable") return "chargers-cables";
  if (subcategory === "earphones") return "audio";
  if (/\bpower bank\b/i.test(h)) return "power-banks";
  if (/\b(holder|mount|car support)\b/i.test(h)) return "holders";
  return "holders";
}

function typeIdFor(category: CatalogTopCategory, subcategory: CatalogSubcategory, h: string): string {
  if (category === "accessories") {
    if (subcategory === "screen-protector") {
      if (/\bcurved\b/i.test(h) && /\bfull glue\b/i.test(h)) return "curved-full-glue";
      if (/\bfull glue\b/i.test(h)) return "full-glue";
      if (/\bprivacy\b/i.test(h)) return "privacy";
      return "normal-glass";
    }
    if (subcategory === "case") {
      if (/\bmagsafe\b/i.test(h)) return "magsafe";
      if (/\bjelly|silicone?\b/i.test(h)) return "jelly";
      if (/\bantishock\b/i.test(h)) return "antishock";
      if (/\bflip|wallet\b/i.test(h)) return "flip";
      if (/\bring (cover|case)\b/i.test(h)) return "ring";
      return "design";
    }
    if (subcategory === "back-cover") return "back-cover";
    if (subcategory === "charger") return "charger";
    if (subcategory === "cable") return "cable";
    if (subcategory === "earphones") return "earphones";
    if (subcategory === "device") return "phone";
    return "other-accessories";
  }
  if (subcategory === "screen") return "screen";
  if (subcategory === "battery") return "battery";
  if (subcategory === "charging-port") return "charging-flex";
  if (subcategory === "camera") return /\bfront camera\b/i.test(h) ? "front-cam" : "rear-cam";
  if (subcategory === "speaker") return "speaker";
  if (subcategory === "flex-cable") return /\bcharging\b/i.test(h) ? "charging-flex" : "main-flex";
  if (subcategory === "housing") return "housing";
  if (/\bback glass|rear glass\b/i.test(h)) return "back-glass";
  return "other-parts";
}

/**
 * Name-first classification. API `partType` / Phone Parts tags are hints only —
 * jelly/covers must never land in Parts because Woo tagged them as Phone Parts.
 */
export function classifyCatalogProduct(p: TaxonomyProduct): CatalogClassification {
  const h = hay(p);
  const issues: string[] = [];
  const group = (p.catalogGroup || "").toLowerCase();
  const apiType = (p.partType || p.specs?.Type || "").trim();

  const n = nameHay(p);
  const accessoryNamed = isAccessoryName(n);
  const partNamed = isPartName(n) && !/\bpower bank\b/i.test(n);
  const finishedDevice = looksLikeFinishedDevice(n, h);

  let category: CatalogTopCategory;
  if (accessoryNamed && partNamed) {
    category = /\b(lcd|oled|incell|digitizer|charging (port|flex)|back glass|rear glass|housing)\b/i.test(n)
      ? "parts"
      : "accessories";
  } else if (partNamed && !finishedDevice) category = "parts";
  else if (accessoryNamed) category = "accessories";
  else if (finishedDevice) category = "accessories";
  else if (PART_GROUP_RE.test(group) && !finishedDevice) category = "parts";
  else if (ACCESSORY_GROUP_RE.test(group) || DEVICE_GROUP_RE.test(group)) category = "accessories";
  else if (isPartName(h) && !isAccessoryName(h) && !finishedDevice) category = "parts";
  else category = "accessories";

  const subcategory = category === "parts" ? partSub(h) : accessorySub(h);

  if (!p.catalogGroup && !p.partType && !p.subcategory) {
    issues.push("missing-category");
  }
  if (accessoryNamed && /phone part/i.test(group)) {
    issues.push("invalid-combo:accessory-in-phone-parts");
  }
  if (partNamed && /accessor/i.test(group) && category === "parts") {
    issues.push("invalid-combo:part-in-accessories-group");
  }
  if (category === "parts" && !PART_SUBS.has(subcategory)) issues.push("invalid-subcategory");
  if (category === "accessories" && !ACC_SUBS.has(subcategory)) issues.push("invalid-subcategory");
  if (apiType && /screen|lcd/i.test(apiType) && category === "accessories" && subcategory === "screen-protector") {
    issues.push("api-type-conflict:lcd-vs-glass");
  }

  return {
    category,
    subcategory,
    browseTop: category,
    browseSub: browseSubFor(category, subcategory, h),
    typeId: typeIdFor(category, subcategory, h),
    issues,
  };
}

export function productMatchesSubcategory(p: TaxonomyProduct, subcategory: CatalogSubcategory): boolean {
  return classifyCatalogProduct(p).subcategory === subcategory;
}

export function auditCatalogProduct(p: TaxonomyProduct): CatalogClassification {
  return classifyCatalogProduct(p);
}

export function suggestedTaxonomyFields(p: TaxonomyProduct): {
  category: CatalogTopCategory;
  subcategory: CatalogSubcategory;
  browseTop: TopCategory;
  browseSub: BrowsePart | BrowseAcc;
} {
  const cls = classifyCatalogProduct(p);
  return { category: cls.category, subcategory: cls.subcategory, browseTop: cls.browseTop, browseSub: cls.browseSub };
}
