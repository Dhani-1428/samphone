/** Side-by-side compare: spec rows for eligible products (cart keys) */
export type SpecKey =
  | "display"
  | "battery"
  | "storage"
  | "camera"
  | "weight"
  | "os"
  | "chip";

export const SPEC_ORDER: SpecKey[] = [
  "display",
  "chip",
  "battery",
  "storage",
  "camera",
  "weight",
  "os",
];

export const SPEC_LABELS_EN: Record<SpecKey, string> = {
  display: "Display",
  chip: "Chip / SoC",
  battery: "Battery",
  storage: "Storage",
  camera: "Main camera",
  weight: "Weight",
  os: "OS",
};

export const SPEC_LABELS_PT: Record<SpecKey, string> = {
  display: "Ecrã",
  chip: "Processador",
  battery: "Bateria",
  storage: "Armazenamento",
  camera: "Câmara",
  weight: "Peso",
  os: "Sistema",
};

/** Reference device / part context for compare (demo data) */
export const DEVICE_SPECS: Partial<
  Record<string, Partial<Record<SpecKey, string>>>
> = {
  "phones:1": {
    display: '6.1" OLED 120Hz',
    chip: "A17 Pro",
    battery: "3274 mAh",
    storage: "128–512 GB",
    camera: "48 MP + 12 MP ultra-wide",
    weight: "187 g",
    os: "iOS 18",
  },
  "phones:2": {
    display: '6.8" AMOLED 120Hz',
    chip: "Snapdragon 8 Gen 3",
    battery: "5000 mAh",
    storage: "256 GB – 1 TB",
    camera: "200 MP + dual tele",
    weight: "233 g",
    os: "Android 14",
  },
  "phones:3": {
    display: '6.1" OLED',
    chip: "A15 Bionic",
    battery: "3279 mAh (replacement)",
    storage: "N/A (part)",
    camera: "12 MP dual",
    weight: "172 g (device ref.)",
    os: "iOS 17",
  },
  "phones:4": {
    display: '6.36" AMOLED 120Hz',
    chip: "Snapdragon 8 Gen 2",
    battery: "4500 mAh",
    storage: "256–512 GB",
    camera: "50 MP triple",
    weight: "185 g",
    os: "Android 14",
  },
  "phones:5": {
    display: '6.4" AMOLED',
    chip: "Exynos 1380",
    battery: "5000 mAh",
    storage: "128–256 GB",
    camera: "50 MP main",
    weight: "202 g",
    os: "Android 14",
  },
  "phones:6": {
    display: '6.1" OLED',
    chip: "A15 Bionic",
    battery: "3240 mAh",
    storage: "128–512 GB",
    camera: "12 MP dual",
    weight: "174 g",
    os: "iOS 16",
  },
  "phones:7": {
    display: '6.67" OLED 120Hz',
    chip: "Snapdragon 8+ Gen 1",
    battery: "4815 mAh",
    storage: "256–512 GB",
    camera: "48 MP triple",
    weight: "200 g",
    os: "Android 14",
  },
  "phones:8": {
    display: '6.82" AMOLED 120Hz',
    chip: "Snapdragon 8 Gen 3",
    battery: "5400 mAh",
    storage: "256–512 GB",
    camera: "50 MP Hasselblad",
    weight: "220 g",
    os: "Android 14",
  },
  "new:1": {
    display: '6.3" OLED',
    chip: "A18 Pro",
    battery: "3582 mAh",
    storage: "256 GB",
    camera: "48 MP fusion",
    weight: "199 g",
    os: "iOS 18",
  },
  "new:2": {
    display: '6.7" AMOLED',
    chip: "Snapdragon 8 Elite",
    battery: "5000 mAh",
    storage: "256 GB",
    camera: "200 MP",
    weight: "218 g",
    os: "Android 15",
  },
  "new:5": {
    display: '6.7" OLED 120Hz',
    chip: "Google Tensor G4",
    battery: "5050 mAh",
    storage: "128–512 GB",
    camera: "50 MP triple",
    weight: "199 g",
    os: "Android 15",
  },
  "home:1": {
    display: "Accessory fit: iPhone 15 Pro",
    chip: "—",
    battery: "—",
    storage: "—",
    camera: "—",
    weight: "Silicone 25 g",
    os: "—",
  },
};

export function hasCompareSpecs(cartKey: string): boolean {
  return Boolean(DEVICE_SPECS[cartKey]);
}
