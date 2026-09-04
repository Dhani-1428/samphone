import {
  APPLE_IPHONE_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_WATCH_MODELS,
} from "@/data/nav-apple";

export type BrandNavModel = { id: string; label: string };
export type BrandNavFamily = {
  id: string;
  label: string;
  test: (hay: string) => boolean;
  models: BrandNavModel[];
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function modelsFrom(labels: string[]): BrandNavModel[] {
  return labels.map((label) => ({ id: slugify(label), label }));
}

const APPLE_FAMILIES: BrandNavFamily[] = [
  {
    id: "iphones",
    label: "iPhone",
    test: (h) => /\biphone\b/.test(h),
    models: modelsFrom(APPLE_IPHONE_MODELS),
  },
  {
    id: "ipad",
    label: "iPad",
    test: (h) => /\bipad\b/.test(h),
    models: modelsFrom(APPLE_IPAD_MODELS),
  },
  {
    id: "iwatch",
    label: "Watch",
    test: (h) => /\b(iwatch|apple watch|watch series|watch se|watch ultra)\b/.test(h),
    models: modelsFrom(APPLE_WATCH_MODELS),
  },
];

const SAMSUNG_FAMILIES: BrandNavFamily[] = [
  { id: "a-series", label: "A series", test: (h) => /\b(galaxy|samsung)\s*a\d/.test(h), models: [] },
  { id: "s-series", label: "S series", test: (h) => /\b(galaxy|samsung)\s*s\d/.test(h), models: [] },
  { id: "z-series", label: "Z series", test: (h) => /\bgalaxy\s*z|\bz\s*(fold|flip)/.test(h), models: [] },
  { id: "m-series", label: "M series", test: (h) => /\b(galaxy|samsung)\s*m\d/.test(h), models: [] },
  { id: "j-series", label: "J series", test: (h) => /\b(galaxy|samsung)\s*j\d/.test(h), models: [] },
  { id: "note-series", label: "Note", test: (h) => /\b(galaxy\s*)?note\s*\d/.test(h), models: [] },
];

const XIAOMI_FAMILIES: BrandNavFamily[] = [
  { id: "redmi-series", label: "Redmi", test: (h) => /\bredmi\b/.test(h) && !/\bnote\b/.test(h) && !/\bpad\b/.test(h) && !/\bpoco\b/.test(h), models: [] },
  { id: "poco-series", label: "Poco", test: (h) => /\bpoco\b/.test(h), models: [] },
  { id: "redmi-note-series", label: "Redmi Note", test: (h) => /\bredmi\s*note\b/.test(h), models: [] },
  { id: "mi-series", label: "Mi series", test: (h) => /\b(\bmi\s+\d|xiaomi\s+\d|xiaomi\s+mi)\b/.test(h) && !/\bredmi\b/.test(h) && !/\bpoco\b/.test(h), models: [] },
];

const HONOR_FAMILIES: BrandNavFamily[] = [
  { id: "magic", label: "Magic", test: (h) => /\bhonor\s*magic|\bmagic\s*\d/.test(h), models: [] },
  { id: "n-series", label: "N series", test: (h) => /\bhonor\s*n\d|\bn\d{2,3}\b/.test(h), models: [] },
  { id: "x-series", label: "X series", test: (h) => /\bhonor\s*x\d/.test(h), models: [] },
  { id: "honor-pad", label: "Honor Pad", test: (h) => /\bhonor\s*(pad|tab)\b/.test(h), models: [] },
];

const MOTOROLA_FAMILIES: BrandNavFamily[] = [
  { id: "g-series", label: "G series", test: (h) => /\b(moto\s*)?g\s*\d|\bg\s*(play|power|plus|5g)\b/.test(h) && !/\bedge\b/.test(h), models: [] },
  { id: "edge-series", label: "Edge series", test: (h) => /\bedge\b/.test(h), models: [] },
  { id: "e-series", label: "E series", test: (h) => /\b(moto\s*)?e\s*\d/.test(h) && !/\bedge\b/.test(h), models: [] },
  { id: "one-series", label: "One series", test: (h) => /\b(moto\s*)?one\b/.test(h), models: [] },
];

const ONEPLUS_FAMILIES: BrandNavFamily[] = [
  { id: "oneplus-series", label: "OnePlus", test: (h) => /\boneplus\b/.test(h) && !/\bnord\b/.test(h), models: [] },
  { id: "oneplus-nord-series", label: "Nord", test: (h) => /\bnord\b/.test(h), models: [] },
];

const OPPO_FAMILIES: BrandNavFamily[] = [
  { id: "reno-series", label: "Reno", test: (h) => /\breno\b/.test(h), models: [] },
  { id: "a-series", label: "A series", test: (h) => /\boppo\s*a\d|\ba\d{2,3}\b/.test(h) && !/\bfind\b/.test(h) && !/\breno\b/.test(h), models: [] },
  { id: "f-series", label: "F series", test: (h) => /\boppo\s*f\d|\bf\d{1,2}\b/.test(h) && !/\bfind\b/.test(h), models: [] },
  { id: "find-x-series", label: "Find X", test: (h) => /\bfind\s*x/.test(h), models: [] },
];

const REALME_FAMILIES: BrandNavFamily[] = [
  { id: "c-series", label: "C series", test: (h) => /\brealme\s*c\d|\bc\d{2}\b/.test(h), models: [] },
  { id: "series", label: "Series", test: (h) => /\brealme\s*\d/.test(h) && !/\b(c|narzo)\d/.test(h), models: [] },
  { id: "narzo-series", label: "Narzo", test: (h) => /\bnarzo\b/.test(h), models: [] },
];

const VIVO_FAMILIES: BrandNavFamily[] = [
  { id: "vivo-series", label: "Vivo", test: (h) => /\bvivo\b/.test(h), models: [] },
];

const BY_SLUG: Record<string, BrandNavFamily[]> = {
  apple: APPLE_FAMILIES,
  iphone: APPLE_FAMILIES,
  samsung: SAMSUNG_FAMILIES,
  xiaomi: XIAOMI_FAMILIES,
  honor: HONOR_FAMILIES,
  motorola: MOTOROLA_FAMILIES,
  oneplus: ONEPLUS_FAMILIES,
  oppo: OPPO_FAMILIES,
  realme: REALME_FAMILIES,
  vivo: VIVO_FAMILIES,
};

export function familiesForBrandSlug(slug: string): BrandNavFamily[] {
  const key = slug.toLowerCase().replace(/\s+/g, "").replace(/-parts$/, "");
  return BY_SLUG[key] ?? [];
}

export function familySearchQuery(family: BrandNavFamily): string {
  if (family.id === "iphones") return "iPhone";
  if (family.id === "iwatch") return "Apple Watch";
  return family.label;
}
