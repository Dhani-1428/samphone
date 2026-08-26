import {
  APPLE_IPHONE_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_IPAD_PRO_MODELS,
  APPLE_IPAD_AIR_MODELS,
  APPLE_IPAD_MINI_MODELS,
  APPLE_WATCH_MODELS,
  APPLE_MACBOOK_MODELS,
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
    test: (h) => /\bipad\b/.test(h) && !/\b(pro|air|mini)\b/.test(h),
    models: modelsFrom(APPLE_IPAD_MODELS),
  },
  {
    id: "ipad-air",
    label: "iPad Air",
    test: (h) => /\bipad\b/.test(h) && /\bair\b/.test(h),
    models: modelsFrom(APPLE_IPAD_AIR_MODELS),
  },
  {
    id: "ipad-mini",
    label: "iPad Mini",
    test: (h) => /\bipad\b/.test(h) && /\bmini\b/.test(h),
    models: modelsFrom(APPLE_IPAD_MINI_MODELS),
  },
  {
    id: "ipad-pro",
    label: "iPad Pro",
    test: (h) => /\bipad\b/.test(h) && /\bpro\b/.test(h),
    models: modelsFrom(APPLE_IPAD_PRO_MODELS),
  },
  {
    id: "iwatch",
    label: "Watch",
    test: (h) => /\b(iwatch|apple watch|watch series|watch se|watch ultra)\b/.test(h),
    models: modelsFrom(APPLE_WATCH_MODELS),
  },
  {
    id: "macbook",
    label: "MacBook",
    test: (h) => /\bmacbook\b/.test(h),
    models: modelsFrom(APPLE_MACBOOK_MODELS),
  },
];

const SAMSUNG_FAMILIES: BrandNavFamily[] = [
  { id: "a-series", label: "A series", test: (h) => /\b(galaxy|samsung)\s*a\d/.test(h), models: [] },
  { id: "s-series", label: "S series", test: (h) => /\b(galaxy|samsung)\s*s\d/.test(h), models: [] },
  { id: "m-series", label: "M series", test: (h) => /\b(galaxy|samsung)\s*m\d/.test(h), models: [] },
  { id: "j-series", label: "J series", test: (h) => /\b(galaxy|samsung)\s*j\d/.test(h), models: [] },
  { id: "z-series", label: "Z series", test: (h) => /\bgalaxy\s*z|\bz\s*(fold|flip)/.test(h), models: [] },
  { id: "note-series", label: "Note", test: (h) => /\b(galaxy\s*)?note\s*\d/.test(h), models: [] },
  { id: "galaxy-tab", label: "Galaxy Tab", test: (h) => /\bgalaxy\s*tab|\btab\s*[as]\d/.test(h), models: [] },
];

const XIAOMI_FAMILIES: BrandNavFamily[] = [
  { id: "redmi-series", label: "Redmi", test: (h) => /\bredmi\b/.test(h) && !/\bnote\b/.test(h) && !/\bpad\b/.test(h), models: [] },
  { id: "redmi-note-series", label: "Redmi Note", test: (h) => /\bredmi\s*note\b/.test(h), models: [] },
  { id: "mi-series", label: "Mi series", test: (h) => /\b(\bmi\s+\d|xiaomi\s+mi)\b/.test(h) && !/\bredmi\b/.test(h), models: [] },
  { id: "xiaomi-pad", label: "Xiaomi Pad", test: (h) => /\b(xiaomi\s*pad|redmi\s*pad)\b/.test(h), models: [] },
];

const HONOR_FAMILIES: BrandNavFamily[] = [
  { id: "magic", label: "Magic", test: (h) => /\bhonor\s*magic|\bmagic\s*\d/.test(h), models: [] },
  { id: "n-series", label: "N series", test: (h) => /\bhonor\s*n\d|\bn\d{2,3}\b/.test(h), models: [] },
  { id: "x-series", label: "X series", test: (h) => /\bhonor\s*x\d/.test(h), models: [] },
  { id: "honor-pad", label: "Honor Pad", test: (h) => /\bhonor\s*(pad|tab)\b/.test(h), models: [] },
];

const MOTOROLA_FAMILIES: BrandNavFamily[] = [
  { id: "razr", label: "Razr", test: (h) => /\brazr\b/.test(h), models: [] },
  { id: "edge", label: "Edge", test: (h) => /\bmoto\s*edge|\bedge\s*\d/.test(h), models: [] },
  { id: "moto-g", label: "Moto G", test: (h) => /\bmoto\s*g\d|\bmoto\s*g\b/.test(h), models: [] },
  { id: "moto-e", label: "Moto E", test: (h) => /\bmoto\s*e\d|\bmoto\s*e\b/.test(h), models: [] },
  { id: "thinkphone", label: "ThinkPhone", test: (h) => /\bthinkphone\b/.test(h), models: [] },
];

const ONEPLUS_FAMILIES: BrandNavFamily[] = [
  { id: "oneplus-series", label: "OnePlus", test: (h) => /\boneplus\b/.test(h) && !/\bnord\b/.test(h), models: [] },
  { id: "oneplus-nord-series", label: "Nord", test: (h) => /\bnord\b/.test(h), models: [] },
];

const OPPO_FAMILIES: BrandNavFamily[] = [
  { id: "find-x-series", label: "Find X", test: (h) => /\bfind\s*x/.test(h), models: [] },
  { id: "reno-series", label: "Reno", test: (h) => /\breno\b/.test(h), models: [] },
  { id: "a-series", label: "A series", test: (h) => /\boppo\s*a\d|\ba\d{2,3}\b/.test(h) && !/\bfind\b/.test(h) && !/\breno\b/.test(h), models: [] },
];

const REALME_FAMILIES: BrandNavFamily[] = [
  { id: "c-series", label: "C series", test: (h) => /\brealme\s*c\d|\bc\d{2}\b/.test(h), models: [] },
  { id: "gt-series", label: "GT series", test: (h) => /\brealme\s*gt|\bgt\s*\d/.test(h), models: [] },
  { id: "p-series", label: "P series", test: (h) => /\brealme\s*p\d/.test(h), models: [] },
  { id: "series", label: "Number series", test: (h) => /\brealme\s*\d/.test(h) && !/\b(c|gt|p)\d/.test(h), models: [] },
];

const VIVO_FAMILIES: BrandNavFamily[] = [
  { id: "x-series", label: "X series", test: (h) => /\bvivo\s*x\d/.test(h), models: [] },
  { id: "y-series", label: "Y series", test: (h) => /\bvivo\s*y\d/.test(h), models: [] },
  { id: "v-series", label: "V series", test: (h) => /\bvivo\s*v\d/.test(h), models: [] },
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
