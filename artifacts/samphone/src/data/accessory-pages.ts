import type { WooProduct } from "@/lib/woocommerce";

export type AccessorySubtype = {
  label: string;
  /** Match against product name + category names. */
  needles: string[];
};

export type AccessoryNavPage = {
  label: string;
  group: string;
  subtypes: AccessorySubtype[];
};

export const ACCESSORY_NAV_PAGES: AccessoryNavPage[] = [
  {
    label: "Powerbanks",
    group: "Powerbanks",
    subtypes: [{ label: "Power Banks", needles: ["power bank", "powerbank"] }],
  },
  {
    label: "Chargers",
    group: "Chargers",
    subtypes: [
      { label: "Adapters", needles: ["adapter"] },
      { label: "Lightning Chargers", needles: ["lightning charger"] },
      { label: "Type-C Chargers", needles: ["type-c charger", "type c charger", "usb-c charger", "type-c chargers"] },
      { label: "Micro-USB Chargers", needles: ["micro-usb charger", "micro usb charger", "micro-usb chargers"] },
      { label: "Wireless Charger", needles: ["wireless charger"] },
    ],
  },
  {
    label: "Cables",
    group: "Cables",
    subtypes: [
      { label: "Lightning Cables", needles: ["lightning cable"] },
      { label: "Type-C Cables", needles: ["type-c cable", "type c cable", "usb-c cable"] },
      { label: "Micro Cables", needles: ["micro cable"] },
      { label: "Internet Cables", needles: ["internet cable"] },
      { label: "HDMI Cables", needles: ["hdmi"] },
    ],
  },
  {
    label: "Headphones",
    group: "Headphones",
    subtypes: [
      { label: "Headphones", needles: ["headphones"] },
      { label: "Earphones", needles: ["earphone"] },
      { label: "Wireless Headset", needles: ["wireless headset", "true wireless", "bt headphone"] },
      { label: "Neck Earphone", needles: ["neck earphone"] },
    ],
  },
  {
    label: "Speakers",
    group: "Speakers",
    subtypes: [{ label: "Speakers", needles: ["speaker"] }],
  },
  {
    label: "Smartwatch",
    group: "Smartwatch",
    subtypes: [
      { label: "Smartwatches", needles: ["smartwatch", "smart watch"] },
      {
        label: "Smartwatch Accessories",
        needles: ["smartwatch accessor", "watch strap", "watch band", "watch charger", "watch case", "watch charging", "iwatch"],
      },
    ],
  },
  {
    label: "Mobile Car Support",
    group: "Mobile Car Support",
    subtypes: [
      { label: "Car Support", needles: ["car support", "car holder", "car mount", "in-car", "magnetic car"] },
      { label: "Car Chargers", needles: ["car charger"] },
    ],
  },
  {
    label: "Laptop",
    group: "Laptop",
    subtypes: [
      { label: "Laptop Chargers", needles: ["laptop charger", "adapter"] },
      { label: "Keyboards", needles: ["keyboard"] },
      { label: "Mice", needles: ["mouse", "mice"] },
      { label: "Hubs & Docks", needles: ["hub", "dock"] },
      { label: "Laptop Holders", needles: ["holder", "stand"] },
      { label: "PC Storage", needles: ["ssd", "hdd", "storage", "flash drive", "pendrive", "memory"] },
      { label: "PC Cables", needles: ["vga", "hdmi", "displayport", "pc cable"] },
      { label: "Laptop Tools", needles: ["tool", "screwdriver"] },
    ],
  },
  {
    label: "Audio & Microphone",
    group: "Audio & Microphone",
    subtypes: [
      { label: "Microphone", needles: ["microphone", "mic"] },
      { label: "Audio Cable", needles: ["audio cable", "aux"] },
    ],
  },
  {
    label: "Electronics",
    group: "Electronics",
    subtypes: [
      { label: "Fans", needles: ["fan"] },
      { label: "Small Electronics", needles: ["electronic", "lamp", "humidifier", "night light", "usb light"] },
    ],
  },
  {
    label: "Beautycare",
    group: "Beautycare",
    subtypes: [{ label: "Hoco Beauty Care", needles: ["beauty"] }],
  },
  {
    label: "Cell AA/AAA",
    group: "Cell AA/AAA",
    subtypes: [
      { label: "AA/AAA Cells", needles: ["aa", "aaa", "cr2032", "button cell", "coin cell"] },
    ],
  },
  {
    label: "Original Accessories",
    group: "Original Accessories",
    subtypes: [
      { label: "Original Accessories", needles: ["original accessor", "oem accessor", "genuine accessor"] },
    ],
  },
  {
    label: "Cards",
    group: "Cards",
    subtypes: [
      { label: "SIM Cards", needles: ["sim card"] },
      { label: "Memory Cards", needles: ["memory card", "microsd", "micro sd", "sd card", "flash drive"] },
    ],
  },
  {
    label: "Repairing Tools",
    group: "Repairing Tools",
    subtypes: [
      { label: "Screwdrivers", needles: ["screwdriver", "phillips", "torx"] },
      { label: "Openers", needles: ["opener", "spudger", "pry tool", "opening tool"] },
      { label: "Repair Kits", needles: ["repair kit", "tool kit", "toolkit"] },
    ],
  },
];

/** Hoco is a brand shop, not one of the 15 accessory groups. */
export const HOCO_SHOP_PAGE: AccessoryNavPage = {
  label: "Hoco",
  group: "Hoco",
  subtypes: [
    { label: "Chargers", needles: ["charger", "adapter"] },
    { label: "Cables", needles: ["cable"] },
    { label: "Cases", needles: ["case", "cover", "jelly"] },
    { label: "Audio", needles: ["earphone", "headphone", "speaker", "headset", "audio"] },
    { label: "Power Banks", needles: ["power bank", "powerbank"] },
    { label: "Car Accessories", needles: ["car"] },
  ],
};

export const ALL_SHOP_PAGES: AccessoryNavPage[] = [...ACCESSORY_NAV_PAGES, HOCO_SHOP_PAGE];

export function accessoryPageHref(group: string, subtype?: string): string {
  const base = `/group/${encodeURIComponent(group)}`;
  if (!subtype) return base;
  return `${base}?type=${encodeURIComponent(subtype)}`;
}

export function findAccessoryPage(group: string): AccessoryNavPage | undefined {
  const key = group.trim().toLowerCase();
  return ALL_SHOP_PAGES.find((p) => p.group.toLowerCase() === key || p.label.toLowerCase() === key);
}

export function isAccessoryNavGroup(group: string): boolean {
  const key = group.trim().toLowerCase();
  return ACCESSORY_NAV_PAGES.some((p) => p.group.toLowerCase() === key || p.label.toLowerCase() === key);
}

function haystack(p: WooProduct): string {
  const cats = (p.categories ?? []).map((c) => `${c.name} ${c.slug}`).join(" ");
  return `${p.name} ${cats}`.toLowerCase();
}

export function productMatchesSubtype(p: WooProduct, subtype: AccessorySubtype): boolean {
  const h = haystack(p);
  return subtype.needles.some((n) => {
    const needle = n.toLowerCase();
    if (needle.length <= 3) {
      return new RegExp(`(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`).test(h);
    }
    return h.includes(needle);
  });
}
