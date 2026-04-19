export interface BrandItem {
  name: string;
  slug: string;
  count: string;
  iconKey: string;
  iconColor: string;
  bgColor: string;
}

export const allBrands: BrandItem[] = [
  { name: "Samsung",     slug: "samsung-parts",          count: "220+ parts", iconKey: "SiSamsung",  iconColor: "#1428A0", bgColor: "#EFF3FF" },
  { name: "Apple",       slug: "iphone-parts",           count: "180+ parts", iconKey: "SiApple",    iconColor: "#333333", bgColor: "#F5F5F5" },
  { name: "Xiaomi",      slug: "xiaomi-parts",           count: "140+ parts", iconKey: "SiXiaomi",   iconColor: "#FF6900", bgColor: "#FFF4EE" },
  { name: "OnePlus",     slug: "oneplus-parts",          count: "70+ parts",  iconKey: "SiOneplus",  iconColor: "#F5010C", bgColor: "#FFF0F0" },
  { name: "OPPO",        slug: "oppo-reno-parts",        count: "90+ parts",  iconKey: "SiOppo",     iconColor: "#1D8348", bgColor: "#EDFBF3" },
  { name: "Huawei",      slug: "huawei-parts",           count: "110+ parts", iconKey: "SiHuawei",   iconColor: "#CF0A2C", bgColor: "#FFF0F2" },
  { name: "Motorola",    slug: "motorola-parts",         count: "60+ parts",  iconKey: "SiMotorola", iconColor: "#ffffff", bgColor: "#1B1B1B" },
  { name: "Nokia",       slug: "nokia-parts",            count: "45+ parts",  iconKey: "SiNokia",    iconColor: "#124191", bgColor: "#EEF3FF" },
  { name: "LG",          slug: "lg-parts",               count: "30+ parts",  iconKey: "SiLg",       iconColor: "#A50034", bgColor: "#FFF0F4" },
  { name: "Sony",        slug: "other-parts",            count: "50+ parts",  iconKey: "SiSony",     iconColor: "#000000", bgColor: "#F5F5F5" },
  { name: "Vivo",        slug: "vivo-parts",             count: "45+ parts",  iconKey: "SiVivo",     iconColor: "#415FFF", bgColor: "#F0F2FF" },
  { name: "Google Pixel",slug: "google-pixel-parts",    count: "55+ parts",  iconKey: "SiGoogle",   iconColor: "#4285F4", bgColor: "#F0F6FF" },
  { name: "Realme",      slug: "realme-parts",           count: "80+ parts",  iconKey: "text",       iconColor: "#FFC500", bgColor: "#FFFBEE" },
  { name: "ZTE",         slug: "zte-parts",              count: "30+ parts",  iconKey: "text",       iconColor: "#003DA5", bgColor: "#EEF2FF" },
  { name: "Alcatel",     slug: "alcatel-parts",          count: "40+ parts",  iconKey: "text",       iconColor: "#E4002B", bgColor: "#FFF0F1" },
  { name: "TCL",         slug: "tcl-parts",              count: "35+ parts",  iconKey: "text",       iconColor: "#003087", bgColor: "#EEF2FF" },
  { name: "Hoco",        slug: "other-hoco-accessories", count: "120+ items", iconKey: "text",       iconColor: "#E07B00", bgColor: "#FFF6EE" },
  { name: "Tablets",     slug: "tablets",                count: "60+ parts",  iconKey: "text",       iconColor: "#6D6D6D", bgColor: "#F5F5F5" },
  { name: "50 TEK",      slug: "other-parts",            count: "50+ items",  iconKey: "text",       iconColor: "#7C3AED", bgColor: "#F5F0FF" },
];
