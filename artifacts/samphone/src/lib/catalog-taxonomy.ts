/** Minimal product shape used by taxonomy + search tests (WooProduct is compatible). */
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
  | "other-accessories";

export type CatalogSubcategory = PartsSubcategory | AccessoriesSubcategory;

export type CatalogClassification = {
  category: CatalogTopCategory;
  subcategory: CatalogSubcategory;
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
  /\b(jelly|silicone?|magsafe|tempered|full glue|privacy glass|screen protect|protector|wallet|flip cover|antishock|popsocket|holder|earphone|headset|earbuds|tws|charger|carregador|adaptador|wall charg|power bank|usb-c cable|lightning cable|data cable|capa|capas|funda|tampas?|covers?|cases?|design cover|soft jelly|back cover|rear cover)\b/i;

const PART_RE =
  /\b(touch\s*\+|lcd|oled|incell|digitizer|service pack|display assembly|\bbattery\b|front camera|rear camera|back camera|charging (flex|port|board)|sim tray|frame|housing|chassis|buzzer|vibrator|earpiece|loudspeaker|motherboard|back glass|rear glass|flex cable|volume flex|power flex)\b/i;

function accessorySub(h: string): AccessoriesSubcategory {
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
  if (/\b(earpiece|loudspeaker|buzzer|speaker)\b/i.test(h) && !/\b(bluetooth speaker|bt speaker|headset)\b/i.test(h)) {
    return "speaker";
  }
  if (/\b(flex|volume flex|power flex|main flex|side button)\b/i.test(h)) return "flex-cable";
  if (/\b(housing|frame|chassis)\b/i.test(h)) return "housing";
  return "other-parts";
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
  const accessoryNamed =
    ACCESSORY_RE.test(n) &&
    !/\b(lcd|oled|incell|digitizer|charging (port|flex)|housing|frame|chassis|back glass|rear glass)\b/i.test(n);
  const partNamed = PART_RE.test(n) && !accessoryNamed && !/\bpower bank\b/i.test(n);

  let category: CatalogTopCategory;
  if (accessoryNamed) category = "accessories";
  else if (partNamed) category = "parts";
  else if (/original accessor|accessor/i.test(group)) category = "accessories";
  else if (/phone part|peça|repair/i.test(group)) category = "parts";
  else category = ACCESSORY_RE.test(h) ? "accessories" : partNamed ? "parts" : "accessories";

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

export function suggestedTaxonomyFields(p: TaxonomyProduct): { category: CatalogTopCategory; subcategory: CatalogSubcategory } {
  const cls = classifyCatalogProduct(p);
  return { category: cls.category, subcategory: cls.subcategory };
}
