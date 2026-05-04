import type { WooProduct } from "@/lib/woocommerce";

/** Filter tabs for model / family catalog pages (Woo product name + categories). */
export type AccessoryBucketId =
  | "all"
  | "cases"
  | "chargers"
  | "screen_glass"
  | "camera_lens"
  | "cables"
  | "audio"
  | "batteries"
  | "screens_parts"
  | "other";

export const ACCESSORY_BUCKET_IDS: Exclude<AccessoryBucketId, "all" | "other">[] = [
  "cases",
  "chargers",
  "screen_glass",
  "camera_lens",
  "cables",
  "audio",
  "batteries",
  "screens_parts",
];

export function productHaystack(p: WooProduct): string {
  const cats = (p.categories ?? []).map((c) => `${c.name} ${c.slug}`).join(" ");
  return `${p.name} ${cats}`.toLowerCase();
}

function testCases(h: string): boolean {
  if (/\b(tempered|privacy|pel[ií]cula|screen\s*protect|protector\s*de\s*ecr|full\s*glue\s*glass|film\s*glass)\b/i.test(h)) {
    if (!/\b(case|cover|funda|capa|bumper|wallet|flip|housing\s*case|charging\s*case)\b/i.test(h)) return false;
  }
  return (
    /\b(case|cover|funda|capa|bumper|wallet|flip\s*cover|flipcover|silicone|silicon|jelly|antishock|ring\s*cover|magsafe\s*cover|book\s*case|tpu|pc\s*case)\b/i.test(
      h,
    ) || /\bcases\b/i.test(h)
  );
}

function testChargers(h: string): boolean {
  if (/\bcharging\s+case\b/i.test(h)) return false;
  return (
    /\b(charger|carregador|adaptador|adapter|wall\s*charg|wireless\s*charg|magsafe\s*charg|qi\s*charg|fast\s*charg|power\s*delivery|\bpd\b\s*\d{2,3}w?|type\s*c\s*charg|lightning\s*charg|micro\s*usb\s*charg)\b/i.test(
      h,
    ) || /\bchargers\b/i.test(h)
  );
}

function testScreenGlass(h: string): boolean {
  return (
    /\b(tempered|privacy\s*glass|screen\s*protect|protector|pel[ií]cula|full\s*glue|normal\s*glass|curved\s*glass|glass\s*film|vidro\s*templado)\b/i.test(
      h,
    ) && !/\b(lcd|oled|digitizer|assembly\s*lcd)\b/i.test(h)
  );
}

function testCameraLens(h: string): boolean {
  return /\b(camera\s*lens|lente\s*c[aâ]mara|lens\s*protect|3\s*in\s*1\s*lens|lens\s*ring|camera\s*glass|lens\s*glass|camera\s*cover)\b/i.test(
    h,
  );
}

function testCables(h: string): boolean {
  return /\b(cable|cabo|lightning|usb\s*c|type\s*c|hdmi|micro\s*usb|aux\s*cable|data\s*cable)\b/i.test(h);
}

function testAudio(h: string): boolean {
  return /\b(earphone|headphone|headset|airpods|speaker|audio|microphone|mic|neck\s*earphone|tws|buds)\b/i.test(h);
}

function testBatteries(h: string): boolean {
  return /\b(battery|bateria|power\s*bank|carregador\s*port[aá]til)\b/i.test(h);
}

function testScreensParts(h: string): boolean {
  return /\b(lcd|oled|digitizer|display|screen\s*assembly|touch\s*screen|touchscreen|flex\s*cable|rear\s*glass|back\s*cover|frame|housing|spare|peça|peças|substitui)\b/i.test(
    h,
  );
}

const testers: Record<Exclude<AccessoryBucketId, "all" | "other">, (h: string) => boolean> = {
  cases: testCases,
  chargers: testChargers,
  screen_glass: testScreenGlass,
  camera_lens: testCameraLens,
  cables: testCables,
  audio: testAudio,
  batteries: testBatteries,
  screens_parts: testScreensParts,
};

export function productMatchesAccessoryBucket(p: WooProduct, bucket: AccessoryBucketId): boolean {
  if (bucket === "all") return true;
  const h = productHaystack(p);
  if (bucket === "other") {
    return !ACCESSORY_BUCKET_IDS.some((id) => testers[id](h));
  }
  return testers[bucket](h);
}

export function productMatchesAnyListedAccessoryBucket(p: WooProduct): boolean {
  const h = productHaystack(p);
  return ACCESSORY_BUCKET_IDS.some((id) => testers[id](h));
}

export function countProductsByAccessoryBucket(products: WooProduct[]): Record<AccessoryBucketId, number> {
  const counts: Record<AccessoryBucketId, number> = {
    all: products.length,
    cases: 0,
    chargers: 0,
    screen_glass: 0,
    camera_lens: 0,
    cables: 0,
    audio: 0,
    batteries: 0,
    screens_parts: 0,
    other: 0,
  };
  for (const p of products) {
    const h = productHaystack(p);
    let matched = false;
    for (const id of ACCESSORY_BUCKET_IDS) {
      if (testers[id](h)) {
        counts[id] += 1;
        matched = true;
      }
    }
    if (!matched) counts.other += 1;
  }
  return counts;
}
