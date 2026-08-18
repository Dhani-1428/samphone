export type NavOtherModel = {
  label: string;
  isNew?: boolean;
};

export type NavOtherBrand = {
  name: string;
  slug: string;
  seeAllHref?: string;
  models: NavOtherModel[];
};

export const NAV_OTHER_BRANDS: NavOtherBrand[] = [
  {
    name: "Asus",
    slug: "asus",
    seeAllHref: "/category/other-parts",
    models: [
      { label: "Zenfone 9" },
      { label: "Zenfone 6 (ZS630KL)" },
      { label: "Zenfone 4 Max (ZC520KL)" },
      { label: "Zenfone 4 (ZE554KL)" },
      { label: "Zenfone Max M2" },
      { label: "Zenfone Max Pro M1" },
      { label: "ZenFone Max Plus M1" },
      { label: "Zenfone Max M1 (ZB555KL)" },
    ],
  },
  {
    name: "Blackview",
    slug: "blackview",
    models: [
      { label: "A80 Pro" },
      { label: "A80" },
      { label: "A70 Pro" },
      { label: "A70" },
      { label: "A60" },
      { label: "BV5500" },
    ],
  },
  {
    name: "Google",
    slug: "google-pixel",
    seeAllHref: "/category/google-pixel-parts",
    models: [
      { label: "Pixel 10 Pro Fold" },
      { label: "Pixel 10 Pro XL" },
      { label: "Pixel 10a" },
      { label: "Pixel 10" },
      { label: "Pixel 9 Pro Fold" },
      { label: "Pixel 9 Pro XL" },
      { label: "Pixel 9 Pro" },
    ],
  },
  {
    name: "Huawei",
    slug: "huawei",
    seeAllHref: "/category/huawei-parts",
    models: [
      { label: "P40 Pro" },
      { label: "P40 Lite 5G" },
      { label: "P40 Lite E" },
      { label: "P40 Lite" },
      { label: "P30 Pro" },
      { label: "P30" },
      { label: "P30 Lite XL/New Edition" },
      { label: "P30 Lite" },
    ],
  },
  {
    name: "Microsoft",
    slug: "microsoft",
    seeAllHref: "/category/other-parts",
    models: [
      { label: "Surface 6" },
      { label: "Surface 3" },
      { label: "Surface Pro X" },
      { label: "Surface Pro 10" },
      { label: "Surface Pro 9" },
      { label: "Surface Pro 7+" },
      { label: "Surface Pro 7" },
      { label: "Surface Pro 6" },
    ],
  },
  {
    name: "Nothing Phone",
    slug: "nothing",
    models: [
      { label: "Phone (3a) Pro" },
      { label: "Phone (3a)" },
      { label: "Phone (2a) Plus" },
      { label: "Phone (2a)" },
      { label: "Phone (2)" },
      { label: "CMF Phone 2 Pro" },
      { label: "CMF Phone 1" },
    ],
  },
  {
    name: "Nintendo",
    slug: "nintendo",
    models: [
      { label: "Switch 2" },
      { label: "Switch Oled" },
      { label: "Switch" },
      { label: "Switch Lite" },
      { label: "Switch Pro", isNew: true },
    ],
  },
  {
    name: "OnePlus",
    slug: "oneplus",
    seeAllHref: "/category/oneplus-parts",
    models: [
      { label: "OnePlus 15R" },
      { label: "OnePlus 15" },
      { label: "OnePlus 13R" },
      { label: "OnePlus 13" },
      { label: "OnePlus 12R" },
      { label: "OnePlus 12" },
      { label: "OnePlus 11 5G" },
      { label: "OnePlus 10T 5G" },
    ],
  },
  {
    name: "Oppo",
    slug: "oppo",
    seeAllHref: "/category/oppo-reno-parts",
    models: [
      { label: "Find X9 Pro" },
      { label: "Find X9" },
      { label: "Find X8 Pro" },
      { label: "Find X8" },
      { label: "Find X5 Pro" },
      { label: "Find X5" },
      { label: "Find X5 Lite" },
      { label: "Find X3 Pro" },
    ],
  },
  {
    name: "Realme",
    slug: "realme",
    seeAllHref: "/category/realme-parts",
    models: [
      { label: "Realme 16 Pro+ 5G" },
      { label: "Realme 16 Pro 5G" },
      { label: "Realme 14T 5G" },
      { label: "Realme 14X 5G" },
      { label: "Realme 14 Pro+ 5G" },
      { label: "Realme 14 Pro 5G" },
      { label: "Realme 14 5G" },
      { label: "Realme 13 5G" },
    ],
  },
  {
    name: "Sony",
    slug: "sony",
    seeAllHref: "/category/other-parts",
    models: [
      { label: "Playstation 5 Slim" },
      { label: "Playstation 5" },
      { label: "Playstation 4 Pro" },
      { label: "Playstation 4 Slim" },
      { label: "Playstation 4" },
      { label: "Xperia 10 IV" },
      { label: "Xperia L4" },
    ],
  },
  {
    name: "TCL",
    slug: "tcl",
    models: [
      { label: "505" },
      { label: "501" },
      { label: "50 SE" },
      { label: "50 Pro 5G" },
      { label: "50 5G" },
      { label: "30 SE" },
    ],
  },
  {
    name: "Vivo",
    slug: "vivo",
    seeAllHref: "/category/vivo-parts",
    models: [
      { label: "X200 Pro 5G" },
      { label: "X90 Pro 5G" },
      { label: "X90 Pro 4G" },
      { label: "X60 Pro" },
      { label: "X51" },
      { label: "Y72 5G" },
      { label: "Y70" },
      { label: "Y52 5G" },
    ],
  },
  {
    name: "Wiko",
    slug: "wiko",
    seeAllHref: "/category/other-parts",
    models: [
      { label: "Power U30" },
      { label: "Power U20" },
      { label: "Power U10" },
      { label: "View 5 Plus" },
      { label: "View 5" },
      { label: "View 4" },
      { label: "View 3 Pro" },
      { label: "View 3" },
    ],
  },
];
