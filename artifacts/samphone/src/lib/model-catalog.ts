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

const ADD_ON =
  /\b(jelly|soft jelly|magsafe|silicon|silicone|tempered|full glue|privacy glass|screen protect|protector|wallet|flip cover|antishock|popsocket|holder|lens 3|camera lens)\b/i;
const REPAIR =
  /\b(touch\s*\+|lcd|oled|incell|digitizer|service pack|battery|front camera|back camera|rear camera|flex|charging (flex|port|board)|sim tray|frame|housing|buzzer|vibrator|earpiece|loudspeaker|motherboard|back cover with|back glass)\b/i;

export function isModelRepairPart(name: string): boolean {
  if (ADD_ON.test(name) && !/\b(touch\s*\+|lcd|oled|incell|flex|charging flex)\b/i.test(name)) return false;
  return REPAIR.test(name);
}

export function splitModelCatalog(products: WooProduct[]): { parts: WooProduct[]; accessories: WooProduct[] } {
  const parts: WooProduct[] = [];
  const accessories: WooProduct[] = [];
  for (const p of products) {
    if (isModelRepairPart(p.name)) parts.push(p);
    else accessories.push(p);
  }
  return { parts, accessories: sortByPrice(accessories, "asc") };
}
