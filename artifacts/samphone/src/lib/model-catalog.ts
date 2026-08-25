import type { WooProduct } from "@/lib/woocommerce";
import { sortByPrice } from "@/lib/woo-product-filters";

export function modelSearchNames(brand: string, modelSlug: string): string[] {
  const raw = modelSlug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  const titled = raw.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  const names = new Set<string>([raw, titled]);
  if (brand === "iphone" || /^iphone\b/i.test(raw)) {
    const rest = raw.replace(/^iphone\s*/i, "");
    names.add(`iPhone ${rest}`.replace(/\s+/g, " ").trim());
    names.add(raw.replace(/^iphone\b/i, "iPhone"));
  }
  if (brand === "samsung" && !/^samsung\b/i.test(raw)) {
    names.add(`Samsung ${titled}`);
    names.add(`Galaxy ${titled}`);
  }
  if (brand === "google-pixel" || brand === "google") {
    const rest = titled.replace(/^pixel\s*/i, "").trim();
    names.add(`Google Pixel ${rest}`.replace(/\s+/g, " ").trim());
    names.add(`Pixel ${rest}`.replace(/\s+/g, " ").trim());
  }
  if (brand === "lg") {
    const rest = titled.replace(/^lg\s*/i, "").trim();
    names.add(`LG ${rest}`);
    names.add(rest);
  }
  return [...names];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Keep iPhone 15 from matching iPhone 15 Pro / Plus / Pro Max. */
export function productBelongsToModel(p: WooProduct, modelLabel: string): boolean {
  const h = norm(`${p.name} ${(p.categories ?? []).map((c) => c.name).join(" ")}`);
  const m = norm(modelLabel);
  if (!m || !h.includes(m)) return false;
  const extras = ["pro max", "pro", "plus", "ultra", "mini", "air"];
  for (const extra of extras) {
    if (m.endsWith(` ${extra}`) || m.includes(` ${extra} `)) continue;
    if (h.includes(`${m} ${extra}`)) return false;
  }
  return true;
}

export type ModelTypeKind = "part" | "accessory";

export type ModelTypeBucket = {
  id: string;
  label: string;
  kind: ModelTypeKind;
  match: (name: string) => boolean;
};

export const MODEL_PART_TYPES: ModelTypeBucket[] = [
  {
    id: "screen",
    label: "Screen / LCD Assembly",
    kind: "part",
    match: (h) =>
      /\b(touch\s*\+|lcd|oled|incell|digitizer|service pack|display)\b/i.test(h) &&
      !/\b(full glue|privacy|tempered|protector|normal glass|curved)\b/i.test(h),
  },
  {
    id: "battery",
    label: "Battery",
    kind: "part",
    match: (h) => /\bbattery\b/i.test(h) && !/\bpower bank\b/i.test(h),
  },
  {
    id: "back-glass",
    label: "Back Glass / Cover",
    kind: "part",
    match: (h) =>
      /\bback (glass|cover)\b/i.test(h) &&
      !/\b(jelly|silicon|silicone|antishock|flip|magsafe|ring cover|design cover)\b/i.test(h),
  },
  {
    id: "housing",
    label: "Housing / Frame",
    kind: "part",
    match: (h) => /\b(housing|frame|chassis)\b/i.test(h),
  },
  {
    id: "front-cam",
    label: "Front Camera",
    kind: "part",
    match: (h) => /\bfront camera\b/i.test(h),
  },
  {
    id: "rear-cam",
    label: "Rear Camera",
    kind: "part",
    match: (h) => /\b(rear camera|back camera)\b/i.test(h),
  },
  {
    id: "cam-lens",
    label: "Camera Lens",
    kind: "part",
    match: (h) => /\bcamera lens\b/i.test(h) && !/\b(3[\s-]*in[\s-]*1|complete)\b/i.test(h),
  },
  {
    id: "charging-flex",
    label: "Charging Port Flex",
    kind: "part",
    match: (h) => /\b(charging (port|flex|board)|charge flex|usb flex)\b/i.test(h),
  },
  {
    id: "speaker",
    label: "Speaker / Earpiece",
    kind: "part",
    match: (h) =>
      /\b(earpiece|loudspeaker|buzzer|speaker)\b/i.test(h) && !/\b(bluetooth speaker|bt speaker)\b/i.test(h),
  },
  {
    id: "fingerprint",
    label: "Fingerprint Flex",
    kind: "part",
    match: (h) => /\b(fingerprint|home button flex)\b/i.test(h),
  },
  {
    id: "side-buttons",
    label: "Side Buttons Flex",
    kind: "part",
    match: (h) => /\b(volume flex|power flex|side button|power \+ volume|volumeflex)\b/i.test(h),
  },
  {
    id: "main-flex",
    label: "Main Flex",
    kind: "part",
    match: (h) => /\bmain flex\b/i.test(h),
  },
  {
    id: "vibrator",
    label: "Vibrator Motor",
    kind: "part",
    match: (h) => /\b(vibrator|vibration motor|taptic)\b/i.test(h),
  },
  {
    id: "sim-tray",
    label: "SIM Tray",
    kind: "part",
    match: (h) => /\bsim tray\b/i.test(h),
  },
  {
    id: "sim-reader",
    label: "SIM Reader",
    kind: "part",
    match: (h) => /\bsim (reader|flex|card reader)\b/i.test(h),
  },
  {
    id: "antenna",
    label: "Antenna Flex",
    kind: "part",
    match: (h) => /\bantenna\b/i.test(h),
  },
];

export const MODEL_ACCESSORY_TYPES: ModelTypeBucket[] = [
  {
    id: "full-glue",
    label: "Full Glue Glass",
    kind: "accessory",
    match: (h) => /\bfull glue\b/i.test(h) && !/\bcurved\b/i.test(h),
  },
  {
    id: "privacy",
    label: "Privacy Glass",
    kind: "accessory",
    match: (h) => /\bprivacy\b/i.test(h),
  },
  {
    id: "normal-glass",
    label: "Normal Glass",
    kind: "accessory",
    match: (h) =>
      /\b(normal glass|tempered glass|screen protect|protector)\b/i.test(h) &&
      !/\b(privacy|full glue|curved)\b/i.test(h),
  },
  {
    id: "lens-3in1",
    label: "Camera Lens 3-IN-1 / Complete",
    kind: "accessory",
    match: (h) => /\b(3[\s-]*in[\s-]*1|lens complete|camera lens complete)\b/i.test(h),
  },
  {
    id: "curved-full-glue",
    label: "Curved Full Glue Glass",
    kind: "accessory",
    match: (h) => /\bcurved\b/i.test(h) && /\bfull glue\b/i.test(h),
  },
  {
    id: "watch-glass",
    label: "Smart Watch Glass",
    kind: "accessory",
    match: (h) => /\b(watch glass|iwatch glass|smart watch glass)\b/i.test(h),
  },
  {
    id: "jelly",
    label: "Silicon Soft Jelly",
    kind: "accessory",
    match: (h) => /\b(jelly|silicone? soft)\b/i.test(h),
  },
  {
    id: "antishock",
    label: "Antishock Cover",
    kind: "accessory",
    match: (h) => /\bantishock\b/i.test(h),
  },
  {
    id: "flip",
    label: "Flip Cover",
    kind: "accessory",
    match: (h) => /\b(flip (cover|case)|wallet)\b/i.test(h),
  },
  {
    id: "ring",
    label: "Ring Cover",
    kind: "accessory",
    match: (h) => /\bring (cover|case|holder)\b/i.test(h),
  },
  {
    id: "magsafe",
    label: "Magsafe Cover",
    kind: "accessory",
    match: (h) => /\bmagsafe\b/i.test(h),
  },
  {
    id: "design",
    label: "Design cover",
    kind: "accessory",
    match: (h) => /\bdesign (cover|case)\b/i.test(h),
  },
];

export const OTHER_PARTS_TYPE: ModelTypeBucket = {
  id: "other-parts",
  label: "Other parts",
  kind: "part",
  match: () => false,
};

export const OTHER_ACCESSORIES_TYPE: ModelTypeBucket = {
  id: "other-accessories",
  label: "Other accessories",
  kind: "accessory",
  match: () => false,
};

const ADD_ON =
  /\b(jelly|soft jelly|magsafe|silicon|silicone|tempered|full glue|privacy glass|screen protect|protector|wallet|flip cover|antishock|popsocket|holder|lens 3|camera lens)\b/i;
const REPAIR =
  /\b(touch\s*\+|lcd|oled|incell|digitizer|service pack|battery|front camera|back camera|rear camera|flex|charging (flex|port|board)|sim tray|frame|housing|buzzer|vibrator|earpiece|loudspeaker|motherboard|back cover with|back glass)\b/i;

export function isModelRepairPart(name: string): boolean {
  if (ADD_ON.test(name) && !/\b(touch\s*\+|lcd|oled|incell|flex|charging flex)\b/i.test(name)) return false;
  return REPAIR.test(name);
}

const API_TYPE_ALIASES: Record<string, string> = {
  "camera lens complete": "lens-3in1",
  "camera lens 3-in-1": "lens-3in1",
  "camera lens 3 in 1": "lens-3in1",
  "full glue glass": "full-glue",
  "privacy glass": "privacy",
  "normal glass": "normal-glass",
  "curved full glue glass": "curved-full-glue",
  "smart watch glass": "watch-glass",
  "silicon soft jelly": "jelly",
  "antishock cover": "antishock",
  "flip cover": "flip",
  "ring cover": "ring",
  "magsafe cover": "magsafe",
  "design cover": "design",
  "screen / lcd assembly": "screen",
  "screen": "screen",
  "lcd assembly": "screen",
  "battery": "battery",
  "back glass / cover": "back-glass",
  "housing / frame": "housing",
  "front camera": "front-cam",
  "rear camera": "rear-cam",
  "camera lens": "cam-lens",
  "charging port flex": "charging-flex",
  "speaker / earpiece": "speaker",
  "fingerprint flex": "fingerprint",
  "side buttons flex": "side-buttons",
  "main flex": "main-flex",
  "vibrator motor": "vibrator",
  "sim tray": "sim-tray",
  "sim reader": "sim-reader",
  "antenna flex": "antenna",
};

function catalogTypeLabel(p: WooProduct): string {
  return (p.partType || p.specs?.Type || "").trim();
}

function bucketFromApiLabel(label: string): { kind: ModelTypeKind; typeId: string } | null {
  const key = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (!key) return null;
  const aliased = API_TYPE_ALIASES[key];
  if (aliased) {
    if (MODEL_ACCESSORY_TYPES.some((t) => t.id === aliased)) return { kind: "accessory", typeId: aliased };
    if (MODEL_PART_TYPES.some((t) => t.id === aliased)) return { kind: "part", typeId: aliased };
  }
  const acc = MODEL_ACCESSORY_TYPES.find((t) => t.label.toLowerCase() === key);
  if (acc) return { kind: "accessory", typeId: acc.id };
  const part = MODEL_PART_TYPES.find((t) => t.label.toLowerCase() === key);
  if (part) return { kind: "part", typeId: part.id };
  return null;
}

const ACCESSORY_MATCH_ORDER = [
  "curved-full-glue",
  "full-glue",
  "privacy",
  "lens-3in1",
  "watch-glass",
  "jelly",
  "antishock",
  "flip",
  "ring",
  "magsafe",
  "design",
  "normal-glass",
];

export function classifyModelProduct(p: WooProduct): { kind: ModelTypeKind; typeId: string } {
  const fromApi = bucketFromApiLabel(catalogTypeLabel(p));
  if (fromApi) return fromApi;
  const h = p.name;
  for (const id of ACCESSORY_MATCH_ORDER) {
    const bucket = MODEL_ACCESSORY_TYPES.find((t) => t.id === id);
    if (bucket?.match(h)) return { kind: "accessory", typeId: id };
  }
  for (const bucket of MODEL_PART_TYPES) {
    if (bucket.match(h)) return { kind: "part", typeId: bucket.id };
  }
  if (isModelRepairPart(h)) return { kind: "part", typeId: OTHER_PARTS_TYPE.id };
  return { kind: "accessory", typeId: OTHER_ACCESSORIES_TYPE.id };
}

function typeIndex(typeId: string, buckets: ModelTypeBucket[]): number {
  const i = buckets.findIndex((t) => t.id === typeId);
  return i >= 0 ? i : buckets.length;
}

function sortByTypeThenPrice(products: WooProduct[], kind: ModelTypeKind): WooProduct[] {
  const buckets = kind === "part" ? MODEL_PART_TYPES : MODEL_ACCESSORY_TYPES;
  const priced = sortByPrice(products, "asc");
  return [...priced].sort((a, b) => {
    const ia = typeIndex(classifyModelProduct(a).typeId, buckets);
    const ib = typeIndex(classifyModelProduct(b).typeId, buckets);
    if (ia !== ib) return ia - ib;
    return 0;
  });
}

export function typesWithCounts(
  products: WooProduct[],
  kind: ModelTypeKind,
): { id: string; label: string; count: number }[] {
  const buckets = kind === "part" ? [...MODEL_PART_TYPES, OTHER_PARTS_TYPE] : [...MODEL_ACCESSORY_TYPES, OTHER_ACCESSORIES_TYPE];
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = classifyModelProduct(p);
    if (c.kind !== kind) continue;
    counts.set(c.typeId, (counts.get(c.typeId) ?? 0) + 1);
  }
  return buckets
    .map((b) => ({ id: b.id, label: b.label, count: counts.get(b.id) ?? 0 }))
    .filter((b) => b.count > 0);
}

export function splitModelCatalog(products: WooProduct[]): { parts: WooProduct[]; accessories: WooProduct[] } {
  const parts: WooProduct[] = [];
  const accessories: WooProduct[] = [];
  for (const p of products) {
    if (classifyModelProduct(p).kind === "part") parts.push(p);
    else accessories.push(p);
  }
  return {
    parts: sortByTypeThenPrice(parts, "part"),
    accessories: sortByTypeThenPrice(accessories, "accessory"),
  };
}
