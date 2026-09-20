import { familiesForBrandSlug } from "@/data/brand-nav-families";
import { NAV_OTHER_BRANDS } from "@/data/nav-others";

export const REPAIR_BRANDS = [
  { slug: "apple", name: "Apple" },
  { slug: "samsung", name: "Samsung" },
  { slug: "xiaomi", name: "Xiaomi" },
  { slug: "huawei", name: "Huawei" },
  { slug: "honor", name: "Honor" },
  { slug: "oppo", name: "Oppo" },
  { slug: "oneplus", name: "OnePlus" },
  { slug: "realme", name: "Realme" },
  { slug: "vivo", name: "Vivo" },
  { slug: "motorola", name: "Motorola" },
  { slug: "google-pixel", name: "Google Pixel" },
  { slug: "nokia", name: "Nokia" },
  { slug: "sony", name: "Sony" },
  { slug: "lg", name: "LG" },
  { slug: "alcatel", name: "Alcatel" },
  { slug: "tcl", name: "TCL" },
  { slug: "zte", name: "ZTE" },
  { slug: "other", name: "Other" },
] as const;

export type RepairBrandSlug = (typeof REPAIR_BRANDS)[number]["slug"];

export const OTHER_MODEL = "__other__";

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out;
}

export function modelsForRepairBrand(slug: string): string[] {
  if (!slug || slug === "other") return [];
  const fromFamilies = familiesForBrandSlug(slug).flatMap((family) => family.models.map((m) => m.label));
  if (fromFamilies.length) return uniqueLabels(fromFamilies);
  const other = NAV_OTHER_BRANDS.find((b) => b.slug === slug);
  return uniqueLabels(other?.models.map((m) => m.label) ?? []);
}

export function brandNameForSlug(slug: string): string {
  return REPAIR_BRANDS.find((b) => b.slug === slug)?.name ?? slug;
}

export function guessBrandAndModel(device: string): { brand: RepairBrandSlug; model: string } {
  const hay = device.trim().toLowerCase();
  if (!hay) return { brand: "other", model: OTHER_MODEL };

  const ranked = [...REPAIR_BRANDS].filter((b) => b.slug !== "other");
  const hit = ranked.find((b) => {
    const name = b.name.toLowerCase();
    if (hay.includes(name)) return true;
    if (b.slug === "apple" && /\biphone\b|\bipad\b/.test(hay)) return true;
    if (b.slug === "samsung" && /\bgalaxy\b/.test(hay)) return true;
    if (b.slug === "google-pixel" && /\bpixel\b/.test(hay)) return true;
    return false;
  });
  if (!hit) return { brand: "other", model: OTHER_MODEL };

  const models = modelsForRepairBrand(hit.slug);
  const model =
    models.find((m) => hay.includes(m.toLowerCase()) || m.toLowerCase().includes(hay)) ?? OTHER_MODEL;
  return { brand: hit.slug, model };
}
