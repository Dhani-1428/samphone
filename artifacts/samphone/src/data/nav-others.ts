export type NavOtherModel = {
  label: string;
  href?: string;
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
    name: "Alcatel",
    slug: "alcatel",
    seeAllHref: "/category/alcatel-parts",
    models: [
      { label: "Alcatel 1B 2022 5031" },
      { label: "Alcatel 1L Pro 2021" },
      { label: "Alcatel 1 2021" },
      { label: "Alcatel 1V 2021" },
      { label: "Alcatel 1S 2021" },
      { label: "Alcatel 1SE 2020" },
      { label: "Alcatel 1 2019" },
      { label: "Alcatel 1S 2020" },
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
    name: "ZTE",
    slug: "zte",
    seeAllHref: "/category/zte-parts",
    models: [
      { label: "ZTE Blade A54" },
      { label: "ZTE A34" },
      { label: "ZTE A33S" },
      { label: "ZTE A31 Plus" },
      { label: "ZTE A31" },
      { label: "ZTE A71" },
      { label: "ZTE A5 2020" },
      { label: "ZTE A7 2020" },
    ],
  },
  {
    name: "Vivo",
    slug: "vivo",
    seeAllHref: "/category/vivo-parts",
    models: [
      { label: "X200 Pro 5G" },
      { label: "X90 Pro 5G" },
      { label: "Y72 5G" },
      { label: "Y36" },
      { label: "V50 5G" },
      { label: "V40 5G" },
      { label: "V29 5G" },
      { label: "V21 5G" },
    ],
  },
  {
    name: "Tablets",
    slug: "tablets",
    seeAllHref: "/tablets",
    models: [
      { label: "iPads", href: "/tablets" },
      { label: "Samsung Tablets", href: "/tablets" },
      { label: "Xiaomi + Redmi", href: "/tablets" },
      { label: "Huawei", href: "/tablets" },
      { label: "Lenovo", href: "/tablets" },
      { label: "TCL", href: "/tablets" },
    ],
  },
  {
    name: "Nokia",
    slug: "nokia",
    seeAllHref: "/category/nokia-parts",
    models: [
      { label: "Nokia X20" },
      { label: "Nokia X10" },
      { label: "Nokia G60" },
      { label: "Nokia G50" },
      { label: "Nokia G21" },
      { label: "Nokia C20" },
      { label: "Nokia 8.3" },
      { label: "Nokia 5.4" },
    ],
  },
  {
    name: "Google Pixel",
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
    name: "LG",
    slug: "lg",
    seeAllHref: "/category/lg-parts",
    models: [
      { label: "LG Velvet" },
      { label: "LG Wing" },
      { label: "LG G8 ThinQ" },
      { label: "LG G7 ThinQ" },
      { label: "LG V40 ThinQ" },
      { label: "LG K50" },
      { label: "LG K40" },
      { label: "LG K30" },
    ],
  },
  {
    name: "Repair Tools",
    slug: "repair-tools",
    seeAllHref: "/tools",
    models: [
      { label: "Screwdrivers", href: "/tools?type=Screwdrivers" },
      { label: "Openers", href: "/tools?type=Openers" },
      { label: "Repair Kits", href: "/tools?type=Repair%20Kits" },
    ],
  },
];
