export const APPLE_IPHONE_MODELS = [
  "iPhone 17E",
  "iPhone 17 Pro Max",
  "iPhone 17 Air",
  "iPhone 17 Pro",
  "iPhone 17G",
  "iPhone 16 Pro Max",
  "iPhone 16 Plus",
  "iPhone 16 Pro",
  "iPhone 16G",
  "iPhone 16E",
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15 Plus",
  "iPhone 15G",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14 Plus",
  "iPhone 14G",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13 Mini",
  "iPhone 13",
  "iPhone 12 Pro",
  "iPhone 12 Pro Max",
  "iPhone 12 Mini",
  "iPhone 12",
];

export const APPLE_WATCH_MODELS = [
  "Apple watch series 9 45mm",
  "Apple watch series 9 41mm",
  "Apple watch series 8 45mm",
  "Apple watch series 8 41mm",
  "Apple watch series 7 45mm",
  "Apple watch series 7 41mm",
  "Apple watch series 6 44mm",
  "Apple watch series 6 40mm",
  "Apple watch series SE2 44mm",
  "Apple watch series SE2 40mm",
  "Apple watch series SE 44mm",
  "Apple watch series SE 40mm",
  "Apple watch series 5 44mm",
  "Apple watch series 5 40mm",
  "Apple watch series 4 44mm",
  "Apple watch series 4 40mm",
  "Apple watch series 3 40mm",
  "Apple watch series 3 38mm",
];

export const APPLE_IPAD_NAV_MODELS = [
  "iPad Air 13 2024(A2898,A2899)",
  "iPad Air 11 2024(A2902,A2903)",
  "iPad Air 2022/Air 5(A2588,A2589,A2591)",
  "iPad Air 2020/Air 4(A2316,A2324,A2072)",
  "iPad Air 2019/Air 3(A2152,A2153,A2123)",
  "iPad Pro 12.9 2022/6th(A2436,A2764,A2437)",
  "iPad Pro 11 2022/4th(A2759,A2435,A2761)",
  "iPad Pro 12.9 2021/5th(A2379,A2461)",
  "iPad Pro 11 2021/3rd(A2301,A2459)",
  "iPad Pro 12.9 2020/4th(A2229,A2069,A2232)",
  "iPad Pro 11 2020/2nd(A2228,A2068,A2230)",
  "iPad Pro 11 2018/1st(A1980,A2013,A1934)",
  "iPad Pro 12.9 2018/3rd(A1876,A2014,A1895)",
  "iPad Pro 10.5 2017(A1701,A1709)",
  "iPad Pro 12.9 2017/2nd(A1670,A1671)",
  "iPad Pro 9.7(A1673,A1674,A1675)",
  "iPad 2022/iPad 10th(A2696,A2757)",
  "iPad 10.2 2021/iPad 9th(A2602,A2603,A2604)",
  "iPad 10.2 2020/iPad 8th(A2270,A2428,A2429)",
  "iPad 10.2 2019/iPad 7th(A2197,A2200,A2198)",
  "iPad 9.7 2018/iPad 6th(A1893,A1954)",
  "iPad 9.7 2017/iPad 5th(A1822,A1823)",
  "iPad Mini 2021/Mini 6(A2568)",
  "iPad Mini 2019/Mini 5(A2133,A2126,A2124)",
];

/** Kept for older links / other menus. */
export const APPLE_IPAD_PRO_MODELS = APPLE_IPAD_NAV_MODELS.filter((n) => /pro/i.test(n));
export const APPLE_IPAD_MINI_MODELS = APPLE_IPAD_NAV_MODELS.filter((n) => /mini/i.test(n));
export const APPLE_IPAD_AIR_MODELS = APPLE_IPAD_NAV_MODELS.filter((n) => /air/i.test(n));
export const APPLE_IPAD_MODELS = APPLE_IPAD_NAV_MODELS.filter((n) => /ipad/i.test(n) && !/pro|mini|air/i.test(n));

export const APPLE_MACBOOK_MODELS = [
  "13\" Unibody (A1342)",
  "Air 15\" M3 (A3114)",
  "Air 13\" M2 (A2681)",
  "Pro 16\" (A2485)",
  "Pro 14\" (A2779)",
];

export const APPLE_NEW_MODELS = new Set<string>();
