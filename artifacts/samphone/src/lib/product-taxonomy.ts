/** Canonical Parts vs Accessories browse taxonomy. Do not use free-text category strings. */
export const TOP_CATEGORIES = ["parts", "accessories"] as const;
export type TopCategory = (typeof TOP_CATEGORIES)[number];

export const PARTS_SUBCATEGORIES = [
  "screens",
  "batteries",
  "charging-ports",
  "housing",
  "cameras",
  "small-components",
] as const;
export type PartsSubcategory = (typeof PARTS_SUBCATEGORIES)[number];

export const ACCESSORIES_SUBCATEGORIES = [
  "cases",
  "screen-protectors",
  "chargers-cables",
  "audio",
  "holders",
  "power-banks",
] as const;
export type AccessoriesSubcategory = (typeof ACCESSORIES_SUBCATEGORIES)[number];

export type BrowseSubcategory = PartsSubcategory | AccessoriesSubcategory;

export const TOP_CATEGORY_LABELS: Record<TopCategory, string> = {
  parts: "Parts",
  accessories: "Accessories",
};

export const SUBCATEGORY_LABELS: Record<BrowseSubcategory, string> = {
  screens: "Screens / Displays",
  batteries: "Batteries",
  "charging-ports": "Charging Ports / Flex Cables",
  housing: "Back Glass / Housing",
  cameras: "Cameras",
  "small-components": "Small components",
  cases: "Cases & Covers",
  "screen-protectors": "Screen Protectors / Tempered Glass",
  "chargers-cables": "Chargers & Cables",
  audio: "Earphones / Audio",
  holders: "Holders & Mounts",
  "power-banks": "Power Banks",
};

export function subsForTop(top: TopCategory): readonly BrowseSubcategory[] {
  return top === "parts" ? PARTS_SUBCATEGORIES : ACCESSORIES_SUBCATEGORIES;
}

export function isTopCategory(v: string | null | undefined): v is TopCategory {
  return v === "parts" || v === "accessories";
}

export function isBrowseSubcategory(top: TopCategory, sub: string | null | undefined): sub is BrowseSubcategory {
  return Boolean(sub && (subsForTop(top) as readonly string[]).includes(sub));
}

export function validateBrowseTaxonomy(top: string, sub: string): void {
  if (!isTopCategory(top)) throw new Error(`Invalid top-level category: ${top}`);
  if (!isBrowseSubcategory(top, sub)) throw new Error(`Invalid ${top} subcategory: ${sub}`);
}

export function browseHref(top: TopCategory): string {
  return top === "parts" ? "/smartphone" : "/accessories";
}
