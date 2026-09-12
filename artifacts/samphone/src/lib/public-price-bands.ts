/** B2C public bands — same tables as backend/wholesale.py. Never apply to approved B2B. */

export const PUBLIC_PRICE_BANDS: readonly [number, number, number][] = [
  [0.0, 1.9, 4.9],
  [1.9, 2.5, 6.9],
  [2.5, 3.0, 7.9],
  [3.0, 4.0, 8.9],
  [4.0, 5.0, 9.9],
  [5.0, 7.0, 12.9],
  [7.0, 8.0, 14.9],
  [8.0, 9.0, 17.5],
  [9.0, 10.0, 19.9],
  [10.0, 12.0, 22.5],
  [12.0, 15.0, 24.9],
  [15.0, 18.0, 29.9],
  [18.0, 23.0, 34.9],
  [23.0, 30.0, 44.9],
  [30.0, 35.0, 49.9],
  [35.0, 40.0, 59.9],
  [40.0, 45.0, 69.9],
  [45.0, 50.0, 79.9],
  [50.0, 60.0, 89.9],
  [60.0, 70.0, 99.9],
  [70.0, 80.0, 119.9],
  [80.0, 90.0, 129.9],
];

export const PARTS_PUBLIC_PRICE_BANDS: readonly [number, number, number][] = [
  [0.0, 2.5, 4.9],
  [2.5, 3.5, 5.9],
  [3.5, 5.0, 9.9],
  [5.0, 8.0, 14.9],
  [8.0, 10.0, 19.9],
  [10.0, 13.0, 22.5],
  [13.0, 15.0, 24.9],
  [15.0, 20.0, 29.9],
  [20.0, 23.0, 34.9],
  [23.0, 27.0, 39.9],
  [27.0, 30.0, 44.9],
  [30.0, 35.0, 49.9],
  [35.0, 40.0, 54.9],
];

const ACCESSORY_CATEGORIES = new Set([
  "Accessories",
  "Hoco",
  "Smartwatches",
  "Cards",
  "Repair Tools",
  "Repairing Tools",
]);

const REPAIR_PART_LEAVES = new Set([
  "screen / lcd assembly",
  "battery",
  "back glass / cover",
  "housing / frame",
  "charging port flex",
  "front camera",
  "rear camera",
  "camera lens",
  "speaker / earpiece",
  "fingerprint flex",
  "side buttons flex",
  "main flex",
  "vibrator motor",
  "sim tray",
  "sim reader",
  "antenna flex",
  "other part",
]);

const GLASS_COVER_LEAVES = new Set([
  "full glue glass",
  "privacy glass",
  "normal glass",
  "camera lens 3-in-1",
  "camera lens complete",
  "curved full glue glass",
  "smart watch glass",
  "silicon soft jelly",
  "antishock cover",
  "flip cover",
  "ring cover",
  "magsafe cover",
  "design cover",
]);

export type BandProduct = {
  category?: unknown;
  leaf_category?: unknown;
  part_type?: unknown;
  b2c_override?: unknown;
  stored_b2c_override?: unknown;
};

function money(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function leafOf(p?: BandProduct | null): string {
  return String(p?.leaf_category || p?.part_type || "")
    .trim()
    .toLowerCase();
}

export function isAccessoryForPublicPricing(p?: BandProduct | null): boolean {
  if (!p) return true;
  const cat = String(p.category || "").trim();
  if (ACCESSORY_CATEGORIES.has(cat)) return true;
  if (cat === "Smartphones") return false;
  const leaf = leafOf(p);
  if (leaf === "repair tools" || leaf === "repairing tools" || leaf === "laptop tools") return true;
  if (GLASS_COVER_LEAVES.has(leaf)) return true;
  if (REPAIR_PART_LEAVES.has(leaf)) return false;
  if (cat === "Phone Parts") return false;
  return true;
}

export function isModelPartForPublicPricing(p?: BandProduct | null): boolean {
  if (!p || isAccessoryForPublicPricing(p)) return false;
  const cat = String(p.category || "").trim();
  if (cat === "Smartphones") return false;
  if (REPAIR_PART_LEAVES.has(leafOf(p))) return true;
  return cat === "Phone Parts";
}

function mapAccessoryBands(value: number): number {
  const bands = PUBLIC_PRICE_BANDS;
  if (value <= bands[0][1]) return bands[0][2];
  const last = bands.length - 1;
  for (let i = 1; i < bands.length; i += 1) {
    const [lo, hi, pub] = bands[i];
    if (i === last) {
      if (lo <= value && value <= hi) return pub;
    } else if (lo <= value && value < hi) {
      return pub;
    }
  }
  return Math.round(value * 100) / 100;
}

function mapPartsBands(value: number): number {
  for (const [, hi, pub] of PARTS_PUBLIC_PRICE_BANDS) {
    if (value <= hi) return pub;
  }
  return Math.round(value * 100) / 100;
}

/** Map B2B/API cost → B2C public. Admin override wins. Complete phones / above-band costs stay raw. */
export function mapPublicRetailPrice(cost: unknown, product?: BandProduct | null, override?: unknown): number {
  const forced = money(override) || (product?.b2c_override ? money(product.stored_b2c_override) : 0);
  if (forced > 0) return Math.round(forced * 100) / 100;
  const value = money(cost);
  if (value <= 0) return 0;
  if (product && isModelPartForPublicPricing(product)) return mapPartsBands(value);
  if (product && !isAccessoryForPublicPricing(product)) return Math.round(value * 100) / 100;
  return mapAccessoryBands(value);
}
