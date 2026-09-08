import {
  APPLE_IPHONE_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_WATCH_MODELS,
} from "@/data/nav-apple";
import {
  HUAWEI_MATE_SERIES_MODELS,
  HUAWEI_NOVA_SERIES_MODELS,
  HUAWEI_P_SERIES_MODELS,
  HUAWEI_Y_SERIES_MODELS,
  MOTOROLA_EDGE_SERIES_MODELS,
  MOTOROLA_E_SERIES_MODELS,
  MOTOROLA_G_SERIES_MODELS,
  MOTOROLA_ONE_SERIES_MODELS,
  ONEPLUS_NORD_SERIES_MODELS,
  ONEPLUS_SERIES_MODELS,
  OPPO_A_SERIES_MODELS,
  OPPO_F_SERIES_MODELS,
  OPPO_FIND_X_SERIES_MODELS,
  OPPO_RENO_SERIES_MODELS,
  REALME_C_SERIES_MODELS,
  REALME_NARZO_SERIES_MODELS,
  REALME_NUMBER_SERIES_MODELS,
  SAMSUNG_A_SERIES_MODELS,
  SAMSUNG_J_SERIES_MODELS,
  SAMSUNG_M_SERIES_MODELS,
  SAMSUNG_NOTE_SERIES_MODELS,
  SAMSUNG_S_SERIES_MODELS,
  SAMSUNG_Z_SERIES_MODELS,
  VIVO_SERIES_MODELS,
  XIAOMI_MI_SERIES_MODELS,
  XIAOMI_POCO_SERIES_MODELS,
  XIAOMI_REDMI_NOTE_SERIES_MODELS,
  XIAOMI_REDMI_SERIES_MODELS,
} from "@/data/nav-brand-models";

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
  { id: "a-series", label: "A series", test: (h) => /\b(galaxy|samsung)\s*a\d/.test(h), models: modelsFrom(SAMSUNG_A_SERIES_MODELS) },
  { id: "s-series", label: "S series", test: (h) => /\b(galaxy|samsung)\s*s\d/.test(h), models: modelsFrom(SAMSUNG_S_SERIES_MODELS) },
  { id: "z-series", label: "Z series", test: (h) => /\bgalaxy\s*z|\bz\s*(fold|flip)/.test(h), models: modelsFrom(SAMSUNG_Z_SERIES_MODELS) },
  { id: "m-series", label: "M series", test: (h) => /\b(galaxy|samsung)\s*m\d/.test(h), models: modelsFrom(SAMSUNG_M_SERIES_MODELS) },
  { id: "j-series", label: "J series", test: (h) => /\b(galaxy|samsung)\s*j\d/.test(h), models: modelsFrom(SAMSUNG_J_SERIES_MODELS) },
  { id: "note-series", label: "Note", test: (h) => /\b(galaxy\s*)?note\s*\d/.test(h), models: modelsFrom(SAMSUNG_NOTE_SERIES_MODELS) },
];

const XIAOMI_FAMILIES: BrandNavFamily[] = [
  { id: "redmi-series", label: "Redmi", test: (h) => /\bredmi\b/.test(h) && !/\bnote\b/.test(h) && !/\bpad\b/.test(h) && !/\bpoco\b/.test(h), models: modelsFrom(XIAOMI_REDMI_SERIES_MODELS) },
  { id: "poco-series", label: "Poco", test: (h) => /\bpoco\b/.test(h), models: modelsFrom(XIAOMI_POCO_SERIES_MODELS) },
  { id: "redmi-note-series", label: "Redmi Note", test: (h) => /\bredmi\s*note\b/.test(h), models: modelsFrom(XIAOMI_REDMI_NOTE_SERIES_MODELS) },
  { id: "mi-series", label: "Mi series", test: (h) => /\b(\bmi\s+\d|xiaomi\s+\d|xiaomi\s+mi)\b/.test(h) && !/\bredmi\b/.test(h) && !/\bpoco\b/.test(h), models: modelsFrom(XIAOMI_MI_SERIES_MODELS) },
];

const HONOR_FAMILIES: BrandNavFamily[] = [
  { id: "magic", label: "Magic", test: (h) => /\bhonor\s*magic|\bmagic\s*\d/.test(h), models: [] },
  { id: "n-series", label: "N series", test: (h) => /\bhonor\s*n\d|\bn\d{2,3}\b/.test(h), models: [] },
  { id: "x-series", label: "X series", test: (h) => /\bhonor\s*x\d/.test(h), models: [] },
  { id: "honor-pad", label: "Honor Pad", test: (h) => /\bhonor\s*(pad|tab)\b/.test(h), models: [] },
];

const MOTOROLA_FAMILIES: BrandNavFamily[] = [
  { id: "g-series", label: "G series", test: (h) => /\b(moto\s*)?g\s*\d|\bg\s*(play|power|plus|5g)\b/.test(h) && !/\bedge\b/.test(h), models: modelsFrom(MOTOROLA_G_SERIES_MODELS) },
  { id: "edge-series", label: "Edge series", test: (h) => /\bedge\b/.test(h), models: modelsFrom(MOTOROLA_EDGE_SERIES_MODELS) },
  { id: "e-series", label: "E series", test: (h) => /\b(moto\s*)?e\s*\d/.test(h) && !/\bedge\b/.test(h), models: modelsFrom(MOTOROLA_E_SERIES_MODELS) },
  { id: "one-series", label: "One series", test: (h) => /\b(moto\s*)?one\b/.test(h), models: modelsFrom(MOTOROLA_ONE_SERIES_MODELS) },
];

const ONEPLUS_FAMILIES: BrandNavFamily[] = [
  { id: "oneplus-series", label: "OnePlus", test: (h) => /\boneplus\b/.test(h) && !/\bnord\b/.test(h), models: modelsFrom(ONEPLUS_SERIES_MODELS) },
  { id: "oneplus-nord-series", label: "Nord", test: (h) => /\bnord\b/.test(h), models: modelsFrom(ONEPLUS_NORD_SERIES_MODELS) },
];

const OPPO_FAMILIES: BrandNavFamily[] = [
  { id: "reno-series", label: "Reno", test: (h) => /\breno\b/.test(h), models: modelsFrom(OPPO_RENO_SERIES_MODELS) },
  { id: "a-series", label: "A series", test: (h) => /\boppo\s*a\d|\ba\d{2,3}\b/.test(h) && !/\bfind\b/.test(h) && !/\breno\b/.test(h), models: modelsFrom(OPPO_A_SERIES_MODELS) },
  { id: "f-series", label: "F series", test: (h) => /\boppo\s*f\d|\bf\d{1,2}\b/.test(h) && !/\bfind\b/.test(h), models: modelsFrom(OPPO_F_SERIES_MODELS) },
  { id: "find-x-series", label: "Find X", test: (h) => /\bfind\s*x/.test(h), models: modelsFrom(OPPO_FIND_X_SERIES_MODELS) },
];

const REALME_FAMILIES: BrandNavFamily[] = [
  { id: "c-series", label: "C series", test: (h) => /\brealme\s*c\d|\bc\d{2}\b/.test(h), models: modelsFrom(REALME_C_SERIES_MODELS) },
  { id: "series", label: "Series", test: (h) => /\brealme\s*\d/.test(h) && !/\b(c|narzo)\d/.test(h), models: modelsFrom(REALME_NUMBER_SERIES_MODELS) },
  { id: "narzo-series", label: "Narzo", test: (h) => /\bnarzo\b/.test(h), models: modelsFrom(REALME_NARZO_SERIES_MODELS) },
];

const VIVO_FAMILIES: BrandNavFamily[] = [
  { id: "vivo-series", label: "Vivo", test: (h) => /\bvivo\b/.test(h), models: modelsFrom(VIVO_SERIES_MODELS) },
];

const HUAWEI_FAMILIES: BrandNavFamily[] = [
  { id: "p-series", label: "P series", test: (h) => /\bhuawei\s*p\d|\bp\d{2}\b/.test(h), models: modelsFrom(HUAWEI_P_SERIES_MODELS) },
  { id: "y-series", label: "Y series", test: (h) => /\bhuawei\s*y\d|\by\d{2}\b/.test(h), models: modelsFrom(HUAWEI_Y_SERIES_MODELS) },
  { id: "mate-series", label: "Mate", test: (h) => /\bmate\b/.test(h) && !/\bpad\b/.test(h), models: modelsFrom(HUAWEI_MATE_SERIES_MODELS) },
  { id: "nova-series", label: "Nova", test: (h) => /\bnova\b/.test(h), models: modelsFrom(HUAWEI_NOVA_SERIES_MODELS) },
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
  huawei: HUAWEI_FAMILIES,
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
