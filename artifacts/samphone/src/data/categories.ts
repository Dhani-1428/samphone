export interface CategoryItem {
  label: string;
  slug: string;
}

export interface CategoryColumn {
  title: string;
  items: CategoryItem[];
}

export const accessoriesColumns: CategoryColumn[] = [
  {
    title: "Screen Protection",
    items: [
      { label: "Full Glue Glass", slug: "full-glue-glass" },
      { label: "Privacy Glass", slug: "privacy-glass" },
      { label: "Normal Glass", slug: "normal-glass" },
      { label: "Camera Lens 3-IN-1", slug: "camera-lens-3in1" },
      { label: "Camera Lens Complete", slug: "camera-lens-complete" },
      { label: "Curved Full Glue Glass", slug: "curved-full-glue-glass" },
      { label: "Smart Watch Glass", slug: "smart-watch-glass" },
    ],
  },
  {
    title: "Cases & Covers",
    items: [
      { label: "Silicon Soft Jelly", slug: "silicon-soft-jelly" },
      { label: "Antishock Cover", slug: "antishock-cover" },
      { label: "Flip Cover", slug: "flip-cover" },
      { label: "Ring Cover", slug: "ring-cover" },
      { label: "Magsafe Cover", slug: "magsafe-cover" },
      { label: "Design Cover", slug: "design-cover" },
      { label: "Wallet Cases", slug: "wallet-cases" },
    ],
  },
  {
    title: "Chargers & Cables",
    items: [
      { label: "Adapters", slug: "adapters" },
      { label: "Lightning Chargers", slug: "lightning-chargers" },
      { label: "Type-C Chargers", slug: "type-c-chargers" },
      { label: "Micro-USB Chargers", slug: "micro-usb-chargers" },
      { label: "Wireless Charger", slug: "wireless-charger" },
      { label: "Lightning Cables", slug: "lightning-cables" },
      { label: "Type-C Cables", slug: "type-c-cables" },
      { label: "Micro Cables", slug: "micro-cables" },
      { label: "HDMI Cables", slug: "hdmi-cables" },
    ],
  },
  {
    title: "Audio & Wearables",
    items: [
      { label: "Wireless Headset", slug: "wireless-headset" },
      { label: "Headphones", slug: "headphones" },
      { label: "Neck Earphone", slug: "neck-earphone" },
      { label: "Speakers", slug: "speakers" },
      { label: "Microphone", slug: "microphone" },
      { label: "Audio Cable", slug: "audio-cable" },
      { label: "Earphones", slug: "earphones" },
      { label: "Smartwatches", slug: "smartwatches" },
      { label: "Smartwatch Accessories", slug: "smartwatch-accessories" },
    ],
  },
  {
    title: "Hoco & Accessories",
    items: [
      { label: "Original Accessories", slug: "original-accessories" },
      { label: "Hoco Beauty Care", slug: "hoco-beauty-care" },
      { label: "Other Hoco Accessories", slug: "other-hoco-accessories" },
      { label: "Hoco Power Banks", slug: "hoco-power-banks" },
      { label: "Hoco Car Accessories", slug: "hoco-car-accessories" },
      { label: "Batteries AA", slug: "batteries-aa" },
    ],
  },
];

export const smartphonesColumns: CategoryColumn[] = [
  {
    title: "Apple & Samsung",
    items: [
      { label: "iPhone Parts", slug: "iphone-parts" },
      { label: "Samsung Parts", slug: "samsung-parts" },
      { label: "Xiaomi Parts", slug: "xiaomi-parts" },
      { label: "Oppo Reno Parts", slug: "oppo-reno-parts" },
      { label: "Realme Parts", slug: "realme-parts" },
      { label: "Huawei Parts", slug: "huawei-parts" },
    ],
  },
  {
    title: "Other Brands",
    items: [
      { label: "One Plus Parts", slug: "oneplus-parts" },
      { label: "Motorola Parts", slug: "motorola-parts" },
      { label: "Alcatel Parts", slug: "alcatel-parts" },
      { label: "TCL Parts", slug: "tcl-parts" },
      { label: "ZTE Parts", slug: "zte-parts" },
      { label: "Vivo Parts", slug: "vivo-parts" },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Tablets", slug: "tablets" },
      { label: "Nokia Parts", slug: "nokia-parts" },
      { label: "Google Pixel Parts", slug: "google-pixel-parts" },
      { label: "LG Parts", slug: "lg-parts" },
      { label: "Other Parts", slug: "other-parts" },
      { label: "Repair Tools", slug: "repair-tools" },
    ],
  },
];

export const cardsColumns: CategoryColumn[] = [
  {
    title: "Memory Cards",
    items: [
      { label: "MicroSD Cards", slug: "microsd-cards" },
      { label: "SD Cards", slug: "sd-cards" },
      { label: "Class 10 Cards", slug: "class-10-cards" },
      { label: "High Speed UHS-I", slug: "high-speed-uhs-i" },
      { label: "High Speed UHS-II", slug: "high-speed-uhs-ii" },
      { label: "Industrial Cards", slug: "industrial-cards" },
    ],
  },
  {
    title: "SIM Cards & Adapters",
    items: [
      { label: "SIM Card Trays", slug: "sim-card-trays" },
      { label: "Nano SIM", slug: "nano-sim" },
      { label: "Micro SIM", slug: "micro-sim" },
      { label: "SIM Adapters", slug: "sim-adapters" },
      { label: "Dual SIM Adapters", slug: "dual-sim-adapters" },
    ],
  },
];

export const allSlugs: Record<string, { label: string; parent: string; parentSlug: string }> = {};

[...accessoriesColumns, ...smartphonesColumns, ...cardsColumns].forEach((col) => {
  col.items.forEach((item) => {
    allSlugs[item.slug] = {
      label: item.label,
      parent: col.title,
      parentSlug: col.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
  });
});
