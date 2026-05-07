import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, ChevronDown, Menu, X, Heart, GitCompare, Phone, User, LogIn, Sun, Moon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { accessoriesColumns, smartphonesColumns, cardsColumns } from "@/data/categories";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { buildWooBrandGroups, type NavBrandGroup } from "@/lib/woo-category-nav";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { useWishlist } from "@/contexts/WishlistContext";
import SmartSearch from "@/components/SmartSearch";

type DropdownKey = "accessories" | "cards" | "allCategories" | null;

/** Shared horizontal inset so top bar, logo row, and blue nav align and do not hug the viewport edges */
const navShell =
  "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

function slugifyModelLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Map Woo / nav category slug (e.g. iphone-parts) to :brand segment used by ModelCatalogPage. */
function catalogBrandForModelRoutes(partsSlug: string): string {
  const s = partsSlug.toLowerCase();
  if (s === "iphone-parts") return "iphone";
  if (s === "samsung-parts") return "samsung";
  if (s === "xiaomi-parts") return "xiaomi";
  return s.replace(/-parts$/i, "") || s;
}

function makeFamilyChildren(brandPartsSlug: string, family: string, labels: string[]) {
  const brand = catalogBrandForModelRoutes(brandPartsSlug);
  return labels.map((label) => {
    const slug = slugifyModelLabel(label);
    return {
      label,
      slug,
      href: `/model/${brand}/${family}/${slug}`,
    };
  });
}

const IPHONE_MODELS = [
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
  "iPhone 11 Pro Max",
  "iPhone 11 Pro",
  "iPhone 11",
  "iPhone XS Max",
  "iPhone XS",
  "iPhone XR",
  "iPhone X",
  "iPhone 8 Plus",
  "iPhone 8",
  "iPhone SE 2022",
  "iPhone SE 2020",
  "iPhone 7 Plus",
  "iPhone 7",
  "iPhone 6S Plus",
  "iPhone 6S",
  "iPhone 6 Plus",
  "iPhone 6",
  "iPhone 5S",
  "iPhone 5",
];

const IPAD_MODELS = [
  "iPad Air 13 2024(A2898,A2899)",
  "iPad Air 11 2024(A2902,A2903)",
  "iPad Pro 12.9 2022/6th(A2436,A2764,A2437)",
  "iPad Pro 11 2022/4th(A2759,A2435,A2761)",
  "iPad 2022/iPad 10th(A2696,A2757)",
  "iPad Air 2022/Air 5(A2588,A2589,A2591)",
  "iPad 10.2 2021/iPad 9th(A2602,A2603,A2604)",
  "iPad Mini 2021/Mini 6(A2568)",
  "iPad Pro 12.9 2021/5th(A2379,A2461)",
  "iPad Pro 11 2021/3rd(A2301,A2459)",
  "iPad 10.2 2020/iPad 8th(A2270,A2428,A2429)",
  "iPad Air 2020/Air 4(A2316,A2324,A2072)",
  "iPad Pro 12.9 2020/4th(A2229,A2069,A2232)",
  "iPad Pro 11 2020/2nd(A2228,A2068,A2230)",
  "iPad 10.2 2019/iPad 7th(A2197,A2200,A2198)",
  "iPad Mini 2019/Mini 5(A2133,A2126,A2124)",
  "iPad Air 2019/Air 3(A2152,A2153,A2123)",
  "iPad Pro 11 2018/1st(A1980,A2013,A1934)",
  "iPad Pro 12.9 2018/3rd(A1876,A2014,A1895)",
  "iPad 9.7 2018/iPad 6th(A1893,A1954)",
  "iPad Pro 10.5 2017(A1701,A1709)",
  "iPad Pro 12.9 2017/2nd(A1670,A1671)",
  "iPad 9.7 2017/iPad 5th(A1822,A1823)",
  "iPad Pro 9.7(A1673,A1674,A1675)",
  "iPad Pro 12.9/1st(A1584,A1652)",
  "iPad Mini 4",
  "iPad Mini 3",
  "iPad Air 2",
  "iPad Air",
  "iPad Mini 2",
  "iPad 4",
  "iPad Mini",
  "iPad 3",
  "iPad 2",
  "iPad 1",
];

const IWATCH_MODELS = [
  "Apple Watch Series 9 45mm",
  "Apple Watch Series 9 41mm",
  "Apple Watch Series 8 45mm",
  "Apple Watch Series 8 41mm",
  "Apple Watch Series 7 45mm",
  "Apple Watch Series 7 41mm",
  "Apple Watch Series 6 44mm",
  "Apple Watch Series 6 40mm",
  "Apple Watch Series SE2 44mm",
  "Apple Watch Series SE2 40mm",
  "Apple Watch Series SE 44mm",
  "Apple Watch Series SE 40mm",
  "Apple Watch Series 5 44mm",
  "Apple Watch Series 5 40mm",
  "Apple Watch Series 4 44mm",
  "Apple Watch Series 4 40mm",
  "Apple Watch Series 3 40mm",
  "Apple Watch Series 3 38mm",
];

const SAMSUNG_A_SERIES_MODELS = [
  "Samsung Galaxy A01 (A015)",
  "Samsung Galaxy A01 core(A013)",
  "Samsung Galaxy A02 (A022)",
  "Samsung Galaxy A2 core (A260)",
  "Samsung Galaxy A02S (A025G)",
  "Samsung Galaxy A02S (A025F)",
  "Samsung Galaxy A03 (A035G)",
  "Samsung Galaxy A03 (A035F)",
  "Samsung Galaxy A03S (A037G)",
  "Samsung Galaxy A03S (A037F)",
  "Samsung Galaxy A03 core (A032)",
  "Samsung Galaxy A04E (A042)",
  "Samsung Galaxy A04 (A045)",
  "Samsung Galaxy A04S (A047)",
  "Samsung Galaxy A05 (A055)",
  "Samsung Galaxy A05S (A057)",
  "Samsung Galaxy A06 (A065)",
  "Samsung Galaxy A07 4G (A075F)",
  "Samsung Galaxy A10 (A105)",
  "Samsung Galaxy A10S (A107)",
  "Samsung Galaxy A11 (A115)",
  "Samsung Galaxy A12 (A125)",
  "Samsung Galaxy A12 (A127)",
  "Samsung Galaxy A13 4G (A135)",
  "Samsung Galaxy A13 4G (A137)",
  "Samsung Galaxy A13 5G (A136)",
  "Samsung Galaxy A14 4G (A145F)",
  "Samsung Galaxy A14 4G (A145P/R)",
  "Samsung Galaxy A14 5G (A146B)",
  "Samsung Galaxy A14 5G (A146P)",
  "Samsung Galaxy A15 4G (A155)",
  "Samsung Galaxy A15 5G (A156)",
  "Samsung Galaxy A16 4G (A165)",
  "Samsung Galaxy A16 5G (A166)",
  "Samsung Galaxy A17 4G (A175F)",
  "Samsung Galaxy A17 5G (A176)",
  "Samsung Galaxy A20E (A202)",
  "Samsung Galaxy A20 (A205)",
  "Samsung Galaxy A21 (A215)",
  "Samsung Galaxy A21S (A217)",
  "Samsung Galaxy A22 4G (A225)",
  "Samsung Galaxy A22 5G (A226)",
  "Samsung Galaxy A23 4G (A235)",
  "Samsung Galaxy A23 5G (A236)",
  "Samsung Galaxy A24 4G (A245)",
  "Samsung Galaxy A25 (A256)",
  "Samsung Galaxy A26 (A266)",
  "Samsung Galaxy A30 (A305)",
  "Samsung Galaxy A30S (A307)",
  "Samsung Galaxy A31 (A315)",
  "Samsung Galaxy A32 (A325)",
  "Samsung Galaxy A32 5G (A326)",
  "Samsung Galaxy A33 5G (A336)",
  "Samsung Galaxy A34 5G (A346)",
  "Samsung Galaxy A35 (A356)",
  "Samsung Galaxy A36 (A366)",
  "Samsung Galaxy A37 5G (A376)",
  "Samsung Galaxy A40 (A405)",
  "Samsung Galaxy A41 (A415)",
  "Samsung Galaxy A42 5G (A426)",
  "Samsung Galaxy A50 (A505)",
  "Samsung Galaxy A50s (A507)",
  "Samsung Galaxy A51 (A515)",
  "Samsung Galaxy A51 5G (A516)",
  "Samsung Galaxy A52 4G (A525)",
  "Samsung Galaxy A52 5G (A526)",
  "Samsung Galaxy A52S 5G (A528)",
  "Samsung Galaxy A53 (A536)",
  "Samsung Galaxy A54 5G (A546)",
  "Samsung Galaxy A55 5G (A556)",
  "Samsung Galaxy A56 5G (A566)",
  "Samsung Galaxy A57 5G (A576)",
  "Samsung Galaxy A70 (A705)",
  "Samsung Galaxy A71 (A715)",
  "Samsung Galaxy A71 5G (A716)",
  "Samsung Galaxy A72 4G (A725)",
  "Samsung Galaxy A73 5G (A736)",
  "Samsung Galaxy A80 (A805)",
  "Samsung Galaxy A90 5G (A908)",
  "Samsung Galaxy A310",
  "Samsung Galaxy A320",
  "Samsung Galaxy A5 (A500)",
  "Samsung Galaxy A510",
  "Samsung Galaxy A520",
  "Samsung Galaxy A530",
  "Samsung Galaxy A600",
  "Samsung Galaxy A605",
  "Samsung Galaxy A750",
];

const SAMSUNG_S_SERIES_MODELS = [
  "Samsung Galaxy S26 Ultra (S948B)",
  "Samsung Galaxy S26 Plus (S947B)",
  "Samsung Galaxy S26 (S942B)",
  "Samsung Galaxy S25 Ultra",
  "Samsung Galaxy S25 Edge",
  "Samsung Galaxy S25 Plus",
  "Samsung Galaxy S25",
  "Samsung Galaxy S25fe (S731b)",
  "Samsung Galaxy S24 FE (S721)",
  "Samsung Galaxy S24 Ultra",
  "Samsung Galaxy S24 (S921)",
  "Samsung Galaxy S24 Plus (S926)",
  "Samsung Galaxy S23 FE (S711)",
  "Samsung Galaxy S23 Ultra (S918)",
  "Samsung Galaxy S23 Plus (S916)",
  "Samsung Galaxy S23 (S911)",
  "Samsung Galaxy S22 Ultra 5G (S908)",
  "Samsung Galaxy S22 Plus 5G (S906)",
  "Samsung Galaxy S22 5G (S901)",
  "Samsung Galaxy S21 FE 5G (G990)",
  "Samsung Galaxy S21 5G (G991)",
  "Samsung Galaxy S21 Plus 5G (G996)",
  "Samsung Galaxy S21 Ultra 5G (G998)",
  "Samsung Galaxy S20 FE (G780)",
  "Samsung Galaxy S20 FE 5G (G781)",
  "Samsung Galaxy S20 5G UW (G981V)",
  "Samsung Galaxy S20 Plus (G985)",
  "Samsung Galaxy S20 Plus 5G (G986)",
  "Samsung Galaxy S20 (G980)",
  "Samsung Galaxy S20 5G (G981)",
  "Samsung Galaxy S20 Ultra (G988B)",
  "Samsung Galaxy S20 Ultra 5G (G988)",
  "Samsung Galaxy S10 Lite (G770)",
  "Samsung Galaxy S10 5G (G977)",
  "Samsung Galaxy S10 Plus (G975)",
  "Samsung Galaxy S10 (G973)",
  "Samsung Galaxy S10E (G970)",
  "Samsung Galaxy S9 Plus (G965)",
  "Samsung Galaxy S9 (G960)",
  "Samsung Galaxy S8 Plus (G955)",
  "Samsung Galaxy S8 (G950)",
  "Samsung Galaxy S7 Edge (G935)",
  "Samsung Galaxy S7 (G930)",
  "Samsung Galaxy S7 Active (G891)",
  "Samsung Galaxy S5 Neo (G903)",
  "Samsung Galaxy S6 Edge Plus (G928)",
  "Samsung Galaxy S6 Edge (G925)",
  "Samsung Galaxy S6 (G920)",
  "Samsung Galaxy S5 (G900)",
];

const SAMSUNG_Z_SERIES_MODELS = [
  "Samsung Galaxy Z Fold 7",
  "Samsung Galaxy Z Fold Special (f958n)",
  "Samsung Galaxy Z Fold 6 (F956)",
  "Samsung Galaxy Z Fold 5 (F946)",
  "Samsung Galaxy Z Fold 4 (F936)",
  "Samsung Galaxy Z Fold 3 5G (F926)",
  "Samsung Galaxy Z Fold 2 5G (F916)",
  "Samsung Galaxy Fold (F900)",
  "Samsung Galaxy Fold 5G (F907)",
  "Samsung Galaxy Z Flip 7fe (f761b)",
  "Samsung Galaxy Z Flip 7",
  "Samsung Galaxy Z Flip 6 (F741)",
  "Samsung Galaxy Z Flip 5 (F731)",
  "Samsung Galaxy Z Flip 4 (F721)",
  "Samsung Galaxy Z Flip 3 5G (F711)",
  "Samsung Galaxy Z Flip 5G (F707)",
  "Samsung Galaxy Z Flip (F700)",
];

const SAMSUNG_M_SERIES_MODELS = [
  "Samsung Galaxy M62 (M625)",
  "Samsung Galaxy M55 (M556)",
  "Samsung Galaxy M54 (M546B)",
  "Samsung Galaxy M53 5G (M536B)",
  "Samsung Galaxy M52 5G (M526)",
  "Samsung Galaxy M51 (M515)",
  "Samsung Galaxy M40 (M405)",
  "Samsung Galaxy M35 (M356)",
  "Samsung Galaxy M34 5G (M346)",
  "Samsung Galaxy M33 5G (M336B)",
  "Samsung Galaxy M32 5G (M326)",
  "Samsung Galaxy M32 (M325)",
  "Samsung Galaxy M31S (M317)",
  "Samsung Galaxy M31 (M315)",
  "Samsung Galaxy M30S (M307)",
  "Samsung Galaxy M30 (M305)",
  "Samsung Galaxy M23 5G (M236B)",
  "Samsung Galaxy M22 (M225)",
  "Samsung Galaxy M21S (F415F)",
  "Samsung Galaxy M21 (M215)",
  "Samsung Galaxy M20 (M205)",
  "Samsung Galaxy M16 (M166)",
  "Samsung Galaxy M15",
  "Samsung Galaxy M14",
  "Samsung Galaxy M13",
  "Samsung Galaxy M12",
  "Samsung Galaxy M11",
  "Samsung Galaxy M10/M105",
  "Samsung Galaxy M06",
];

const SAMSUNG_J_SERIES_MODELS = [
  "Samsung Galaxy J8 (J810)",
  "Samsung Galaxy J7 Pro (J730)",
  "Samsung Galaxy J7 2017 (J730)",
  "Samsung Galaxy J7 2016 (J710)",
  "Samsung Galaxy J7 Prime",
  "Samsung Galaxy J5 (J500)",
  "Samsung Galaxy J5 2016 (J510)",
  "Samsung Galaxy J5 Prime",
  "Samsung Galaxy J6 Prime",
  "Samsung Galaxy J6 Plus",
  "Samsung Galaxy J4 (J400)",
  "Samsung Galaxy J4 (J400) Plus",
  "Samsung Galaxy J3 2017 (J330)",
  "Samsung Galaxy J3 2016 (J320)",
  "Samsung Galaxy J4 Core",
  "Samsung Galaxy J2 Core",
  "Samsung Galaxy J530",
  "Samsung Galaxy J600",
];

const SAMSUNG_NOTE_SERIES_MODELS = [
  "Samsung Galaxy Note 20 Ultra (N985/986)",
  "Samsung Galaxy Note 20 (N980/981)",
  "Samsung Galaxy Note 10 Lite (N770)",
  "Samsung Galaxy Note 10 Plus (N975/976)",
  "Samsung Galaxy Note 10 (N970/971)",
  "Samsung Galaxy Note 9 (N960)",
  "Samsung Galaxy Note 8 (N950)",
];

const XIAOMI_REDMI_SERIES_MODELS = [
  "Xiaomi Redmi 15 5G",
  "Xiaomi Redmi 15 4G/171M",
  "Xiaomi Redmi 15 4G 169.5M",
  "Xiaomi Redmi 15C EU Version",
  "Xiaomi Redmi 15C 4G/5G",
  "Xiaomi Redmi 14C",
  "Xiaomi Redmi 13C 5G",
  "Xiaomi Redmi 13C 4G",
  "Xiaomi Redmi 13 4G",
  "Xiaomi Redmi 12C",
  "Xiaomi Redmi 12 5G",
  "Xiaomi Redmi 12 4G",
  "Xiaomi Redmi A7 Pro",
  "Xiaomi Redmi A5 4G 2025 173.4M",
  "Xiaomi Redmi A5 4G 2025 171.8M",
  "Xiaomi Redmi A4",
  "Xiaomi Redmi A3 Pro",
  "Xiaomi Redmi A3X",
  "Xiaomi Redmi A3",
  "Xiaomi Redmi A2 Plus",
  "Xiaomi Redmi A2",
  "Xiaomi Redmi A1 Plus",
  "Xiaomi Redmi A1",
  "Xiaomi Redmi 10 2022",
  "Xiaomi Redmi 10A",
  "Xiaomi Redmi 10 5G",
  "Xiaomi Redmi 10C",
  "Xiaomi Redmi 10",
  "Xiaomi Redmi 9T",
  "Xiaomi Redmi 9C",
  "Xiaomi Redmi 9A",
  "Xiaomi Redmi 9AT",
  "Xiaomi Redmi 9",
  "Xiaomi Redmi 8",
  "Xiaomi Redmi 8A",
  "Xiaomi Redmi 7A",
  "Xiaomi Redmi 7",
  "Xiaomi Redmi 6",
  "Xiaomi Redmi 6A",
  "Xiaomi Redmi S2",
  "Xiaomi Redmi 5 Plus",
];

const XIAOMI_REDMI_NOTE_SERIES_MODELS = [
  "Xiaomi Redmi Note 15 5G",
  "Xiaomi Redmi Note 15 Pro 5G",
  "Xiaomi Redmi Note 15 Pro Plus 5G",
  "Xiaomi Redmi Note 14 Pro Plus 5G",
  "Xiaomi Redmi Note 14 Pro 5G",
  "Xiaomi Redmi Note 14 Pro 4G",
  "Xiaomi Redmi Note 14 5G",
  "Xiaomi Redmi Note 14 4G Global",
  "Xiaomi Redmi Note 14 4G EU",
  "Xiaomi Redmi Note 13 5G",
  "Xiaomi Redmi Note 13 4G",
  "Xiaomi Redmi Note 13 Pro 4G",
  "Xiaomi Redmi Note 13 Pro Plus 5G",
  "Xiaomi Redmi Note 13 Pro 5G",
  "Xiaomi Redmi Note 12T Pro",
  "Xiaomi Redmi Note 12 Pro Plus 5G",
  "Xiaomi Redmi Note 12S",
  "Xiaomi Redmi Note 12 Pro 4G",
  "Xiaomi Redmi Note 12 Pro 5G",
  "Xiaomi Redmi Note 12 4G",
  "Xiaomi Redmi Note 11R",
  "Xiaomi Redmi Note 11S 5G",
  "Xiaomi Redmi Note 11S",
  "Xiaomi Redmi Note 11 Pro 5G",
  "Xiaomi Redmi Note 11T 5G",
  "Xiaomi Redmi Note 11 Pro Plus 5G",
  "Xiaomi Redmi Note 11 5G",
  "Xiaomi Redmi Note 11 Pro",
  "Xiaomi Redmi Note 11 4G",
  "Xiaomi Redmi Note 10 Lite",
  "Xiaomi Redmi Note 8 2021",
  "Xiaomi Redmi Note 10T 5G",
  "Xiaomi Redmi Note 10S",
  "Xiaomi Redmi Note 10 Pro Max",
  "Xiaomi Redmi Note 9 5G",
  "Xiaomi Redmi Note 10 Pro",
  "Xiaomi Redmi Note 9 Pro 5G",
  "Xiaomi Redmi Note 10 5G",
  "Xiaomi Redmi Note 10 4G",
  "Xiaomi Redmi Note 9T",
  "Xiaomi Redmi Note 9",
  "Xiaomi Redmi Note 9s",
  "Xiaomi Redmi Note 9 Pro",
  "Xiaomi Redmi Note 9 Pro Max",
  "Xiaomi Redmi Note 8",
  "Xiaomi Redmi Note 8T",
  "Xiaomi Redmi Note 8 Pro",
  "Xiaomi Redmi Note 7S",
  "Xiaomi Redmi Note 7 Pro",
  "Xiaomi Redmi Note 7",
  "Xiaomi Redmi Note 6 Pro",
  "Xiaomi Redmi Note 5 Pro",
  "Xiaomi Redmi Note 5",
  "Xiaomi Redmi Note 5A",
  "Xiaomi Redmi Note 4X",
  "Xiaomi Redmi Note 4",
];

const XIAOMI_MI_SERIES_MODELS = [
  "Xiaomi 17 Pro Max",
  "Xiaomi 17 Pro",
  "Xiaomi 17",
  "Xiaomi 15 Pro Plus",
  "Xiaomi 15 Pro",
  "Xiaomi 15T",
  "Xiaomi 15T Pro",
  "Xiaomi 15",
  "Xiaomi 14T Pro",
  "Xiaomi 14T",
  "Xiaomi 14 Pro",
  "Xiaomi 14 Ultra",
  "Xiaomi 14",
  "Xiaomi 13T Pro",
  "Xiaomi 13T",
  "Xiaomi 13 Ultra",
  "Xiaomi 13 Lite",
  "Xiaomi 13 Pro",
  "Xiaomi 13",
  "Xiaomi 12 Lite NE",
  "Xiaomi 12T Pro",
  "Xiaomi 12T",
  "Xiaomi 12S Ultra",
  "Xiaomi 12S",
  "Xiaomi 12 Lite",
  "Xiaomi 11 Lite 5G NE",
  "Xiaomi 12 Pro",
  "Xiaomi 12X",
  "Xiaomi 12",
  "Xiaomi Mi 11X Pro",
  "Xiaomi 11T Pro",
  "Xiaomi 11T",
  "Xiaomi Mi 11 Ultra",
  "Xiaomi Mi 11i",
  "Xiaomi Mi 11 Pro",
  "Xiaomi Mi 11 Lite 5G",
  "Xiaomi Mi 11 Lite",
  "Xiaomi Mi 10S",
  "Xiaomi Mi 11",
  "Xiaomi Mi 10T 5G",
  "Xiaomi Mi 10T Lite 5G",
  "Xiaomi Mi 10 Ultra",
  "Xiaomi Mi 10T Pro 5G",
  "Xiaomi Mi 10 Lite 5G",
  "Xiaomi Mi 10 Pro 5G",
  "Xiaomi Mi 10 5G",
  "Xiaomi Mi 9 Lite",
  "Xiaomi Mi CC9",
  "Xiaomi Mi 9T",
  "Xiaomi Mi 9T Pro",
  "Xiaomi Mi A3",
  "Xiaomi Mi 9 Pro",
  "Xiaomi Mi 9 SE",
  "Xiaomi Mi 9",
  "Xiaomi Mi 8 Pro",
  "Xiaomi Mi 8 Lite",
  "Xiaomi Mi Max 3",
  "Xiaomi Mi 8",
  "Xiaomi Mi 8 SE",
  "Xiaomi Mi A2 (Mi 6X)",
  "Xiaomi Mi Max 2",
  "Xiaomi Mi 6",
  "Xiaomi Mi Max",
];

const OPPO_RENO_SERIES_MODELS = [
  "Oppo Reno 14 Pro 5G",
  "Oppo Reno 14 FS 5G",
  "Oppo Reno 14 F",
  "Oppo Reno 14 5G",
  "Oppo Reno 13 Pro",
  "Oppo Reno 13F 4G",
  "Oppo Reno 13F 5G",
  "Oppo Reno 13 FS",
  "Oppo Reno 13",
  "Oppo Reno 12Pro 5G(CPH2629)",
  "Oppo Reno 12F 5G(CPH2637)",
  "Oppo Reno 12 5G(CPH2625)",
  "Oppo Reno 11F (CPH2603)",
  "Oppo Reno 11 (CPH2599)",
  "Oppo Reno11Pro (CPH2607)",
  "Oppo Reno 10 (CPH2531)",
  "Oppo Reno 8T 5G (CPH2505)",
  "Oppo Reno 10 Pro Plus CPH2521)",
  "Oppo Reno10 Pro (CPH2525)",
  "Oppo Reno 8T 4G(CPH2481)",
  "Oppo Reno 8 Pro 5G (CPH2357)",
  "Oppo Reno 8 5G (CPH2359)",
  "Oppo Reno 7Z 5G (CPH2343)",
  "Oppo Reno 7 5G (CPH2371)",
  "Oppo Reno 8Lite 5G (CPH2343)",
  "Oppo Reno 7Lite (CPH2343)",
  "Oppo Reno 7Pro 5G (PFDM00,CPH2293)",
  "Oppo Reno 7SE 5G",
  "Oppo Reno 7 4G (CPH2363)",
  "Oppo Reno 6 (CPH2235)",
  "Oppo Reno 6Lite (CPH2365)",
  "Oppo Reno 6Pro 5G (CPH2249)",
  "Oppo Reno 5A (CPH2199)",
  "Oppo Reno 6Pro 5G (CPH2247)",
  "Oppo Reno 6Z (CPH2237)",
  "Oppo Reno 6 5G (CPH2251)",
  "Oppo Reno 5F (CPH2217)",
  "Oppo Reno 5Pro 5G (PDSM00,PDST00,CPH2201)",
  "Oppo Reno 5Z (CPH2211)",
  "Oppo Reno 4Lite (CPH2125)",
  "Oppo Reno 5Lite (CPH2205)",
  "Oppo Reno 5 5G (CPH2145)",
  "Oppo Reno 5 4G (CPH2159)",
  "Oppo Reno 4Pro (CPH2109)",
  "Oppo Reno 4 5G (CPH2091)",
  "Oppo Reno 4Pro 5G (CPH2089)",
  "Oppo Reno 4Z 5G (CPH2065)",
  "Oppo Reno 3 (CPH2043)",
  "Oppo Reno 3Pro (CPH2035,CPH2037,CPH2036)",
  "Oppo Reno A (CPH1983)",
  "Oppo Reno 2Z",
  "Oppo Reno 2F",
  "Oppo Reno 2",
  "Oppo Reno Z",
  "Oppo Reno",
  "Oppo Reno 10x zoom",
  "Oppo Reno 5G",
];

const OPPO_A_SERIES_MODELS = [
  "Oppo A40",
  "Oppo A40m (CPH2669)",
  "Oppo A80 (CPH2639)",
  "Oppo A3 Pro (CPH2639)",
  "Oppo A3S",
  "Oppo A60 (CPH2631)",
  "Oppo A60 5G",
  "Oppo A18 (CPH2591)",
  "Oppo A38 (CPH2579)",
  "Oppo A78 4G (CPH2565)",
  "Oppo A98 5G (CPH2529)",
  "Oppo A58 4G (CPH2577)",
  "Oppo A79 (CPH2553)",
  "Oppo A78 5G (CPH2483)",
  "Oppo A17 (CPH2477)",
  "Oppo A57s (CPH2385)",
  "Oppo A57 4G (CPH2387)",
  "Oppo A96 5G (PFUM10)",
  "Oppo A77 5G (CPH2339)",
  "Oppo A58 (CPH2577)",
  "Oppo A57 5G (PFTM20)",
  "Oppo A96 (CPH2333)",
  "Oppo A76 (CPH2375)",
  "Oppo A54s (CPH2273)",
  "Oppo A16s (CPH2271)",
  "Oppo A93s 5G (PFGM00)",
  "Oppo A95 5G (PELM00)",
  "Oppo A16 (CPH2269)",
  "Oppo A92 (CPH2059)",
  "Oppo A12 (CPH2083,CPH2077)",
  "Oppo A32 (PDVM00)",
  "Oppo A35 (PEHM00,PEFM00)",
  "Oppo A93 5G (PCGM00,PEHM00)",
  "Oppo A94 4G (CPH2203)",
  "Oppo A74 5G (CPH2197)",
  "Oppo A74 4G (CPH2219)",
  "Oppo A54 4G (CPH2239)",
  "Oppo A94 5G (CPH2211)",
  "Oppo A54 5G (CPH2195)",
  "Oppo A52 (CPH2061,CPH2069)",
  "Oppo A73 5G (CPH2161)",
  "Oppo A15 (CPH2185)",
  "Oppo A31 2020 (CPH2015,CPH2073)",
  "Oppo A73 4G 2020 (CPH2099)",
  "Oppo A53s (CPH2135)",
  "Oppo A53 2020 (CPH2127)",
  "Oppo A72 5G (PDYM20,PDYT20)",
  "Oppo A72 4G (CPH2067)",
  "Oppo A93 4G (CPH2121,CPH2123)",
  "Oppo A8",
  "Oppo A91 (CPH2001,CPH2021)",
  "Oppo A5 2020 (CPH1931,CPH195)",
  "Oppo A9 2020 (CPH1937,CPH1939)",
  "Oppo A9x (PCEM00)",
  "Oppo A7n (PCDM00,PCDT00)",
  "Oppo A9 2019 (CPH1938)",
  "Oppo A1k (CPH1923)",
  "Oppo A7X (PBBM00,PBBT00)",
  "Oppo A5s (AX5s)(CPH1909)",
  "Oppo A5 (AX5)(CPH1809,CPH1851)",
  "Oppo A5 Pro",
  "Oppo A3S (CPH1803,CPH1853)",
  "Oppo A7 (AX7)(CPH1901,CPH1903,CPH1905)",
  "Oppo A3 (PADM00,CPH1837,PADT00)",
  "Oppo A1 2018",
  "Oppo A71 2018(CPH1801)",
  "Oppo A83 (CPH1729,CPH1827)",
  "Oppo A77 2017 (CPH1715)",
  "Oppo A77 (Mediatek)",
  "Oppo A57 2016 (CPH1701)",
  "Oppo A37 (A37f,A37fw,A37m)",
  "Oppo A59",
  "Oppo A33 2015",
  "Oppo A31 2015",
];

const OPPO_F_SERIES_MODELS = [
  "Oppo F19",
  "Oppo F17 Pro (CPH2119)",
  "Oppo F17",
  "Oppo F15 (CPH2001)",
  "Oppo F11 (CPH1913,CPH1911)",
  "Oppo F11 Pro (CPH1969,CPH2209)",
  "Oppo F9 (F9 Pro)",
  "Oppo F9 Pro",
  "Oppo F9",
  "Oppo F7",
];

const OPPO_FIND_X_SERIES_MODELS = [
  "Oppo Find X9",
  "Oppo Find X9 Pro",
  "Oppo Find X8 Ultra",
  "Oppo Find X8 Pro (PKC110/PKC130)",
  "Oppo Find X7",
  "Oppo Find X7 Ultra",
  "OPPO Find X6 Pro (PGEM110/PGEM10)",
  "Oppo Find X5 (CPH2307)",
  "Oppo Find X5 Pro (CPH2305)",
  "Oppo Find X5 Lite (CPH2371)",
  "Oppo Find X3 Pro (CPH2173)",
  "Oppo Find X3 Neo (CPH2207)",
  "Oppo Find X3 Lite (CPH2145)",
  "Oppo Find X3 (PEDM00)",
  "Oppo Find X2 (CPH2023)",
  "Oppo Find X2 Pro (CPH2025)",
  "Oppo Find X2 Lite (CPH2005)",
  "Oppo Find X2 Neo (CPH2009)",
  "Oppo Find X (CPH1871)",
];

const REALME_C_SERIES_MODELS = [
  "Realme C61",
  "Realme C63",
  "Realme C65",
  "Realme C67 5G",
  "Realme C53",
  "Realme C51",
  "Realme C55",
  "Realme C33",
  "Realme C30s",
  "Realme C31S",
  "Realme C30",
  "Realme C31",
  "Realme C35",
  "Realme C25",
  "Realme C15",
  "Realme C25Y",
  "Realme C25s",
  "Realme C3i",
  "Realme C21-Y",
  "Realme C20",
  "Realme C12",
  "Realme C11 2021",
  "Realme C17",
  "Realme C21",
  "Realme C11",
  "Realme C3",
  "Realme C3 (3 cameras)",
  "Realme C2",
];

const REALME_NUMBER_SERIES_MODELS = [
  "Realme 12 4G",
  "Realme 12x",
  "Realme 12 Plus",
  "Realme 12 5G",
  "Realme 12 Pro Plus",
  "Realme 12 Pro",
  "Realme 11 5G",
  "Realme 11 4G",
  "Realme 11 Pro Plus",
  "Realme 11 Pro",
  "Realme 10 Pro",
  "Realme 10 Pro Plus",
  "Realme 10 5G",
  "Realme 10 4G",
  "Realme 9i 5G",
  "Realme 9 Pro",
  "Realme 9 5G",
  "Realme 9",
  "Realme 9 Pro Plus",
  "Realme 9i",
  "Realme 8i",
  "Realme 8 4G",
  "Realme 8s 5G",
  "Realme 8 5G",
  "Realme 8 Pro",
  "Realme 7i Global",
  "Realme 7 5G",
  "Realme 7i Asia",
  "Realme 7 Global",
  "Realme 7 Pro",
  "Realme 7 Asia",
  "Realme 6S",
  "Realme 6 Pro",
  "Realme 6",
  "Realme 6i",
  "Realme 5 Pro",
  "Realme 5",
  "Realme 5i",
  "Realme 3 Pro",
];

const REALME_NARZO_SERIES_MODELS = [
  "Realme Narzo 50i Prime",
  "Realme Narzo 50i",
  "Realme Narzo 50A",
  "Realme Narzo 50A Prime",
  "Realme Narzo 50",
  "Realme Narzo 50 5G",
  "Realme Narzo 30 Pro 5G",
  "Realme Narzo 20A",
  "Realme Narzo 20",
  "Realme Narzo 30A",
  "Realme Narzo 30 5G",
];

const HUAWEI_P_SERIES_MODELS = [
  "Huawei Pura 80 Ultra",
  "Huawei Pura 80 Pro",
  "Huawei Pura 70 Ultra",
  "Huawei Pura 70 Pro",
  "Huawei Pura 70 Pro Plus",
  "Huawei Pura 70",
  "Huawei P60 Pro",
  "Huawei P60 Plus",
  "Huawei P60",
  "Huawei P50 Pocket",
  "Huawei P50 Pro",
  "Huawei P50",
  "Huawei P Smart S",
  "Huawei P smart 2021",
  "Huawei P smart 2020",
  "Huawei P40",
  "Huawei P40 Pro",
  "Huawei P40 Pro Plus",
  "Huawei P40 Lite",
  "Huawei P40 Lite 5G",
  "Huawei P40 Lite E",
  "Huawei P20 lite 2019",
  "Huawei P Smart Pro 2019",
  "Huawei P30 lite New Edition",
  "Huawei P Smart Z",
  "Huawei P30 Lite",
  "Huawei P30 Pro New Edition",
  "Huawei P30 Pro",
  "Huawei P30",
  "Huawei P Smart 2019",
  "Huawei P Smart Plus 2019",
  "Huawei P Smart+/nova 3i",
  "Huawei P20 Pro",
  "Huawei P20",
  "Huawei P20 Lite",
  "Huawei P9 Lite mini/Y6 Pro 2017",
  "Huawei P smart",
  "Huawei P10 Lite",
  "Huawei P10 Plus",
  "Huawei P10",
  "Huawei P8 Lite 2017",
  "Huawei P9 Plus",
  "Huawei P9 Lite",
  "Huawei P9",
  "Huawei P8 Max",
  "Huawei P8 Lite",
  "Huawei P8",
  "Huawei P7",
  "Huawei P6",
];

const HUAWEI_Y_SERIES_MODELS = [
  "Huawei Y9A",
  "Huawei Y7A",
  "Huawei Y8S",
  "Huawei Y8P",
  "Huawei Y5P",
  "Huawei Y6P",
  "Huawei Y7P",
  "Huawei Y5 Prime 2018",
  "Huawei Y9S",
  "Huawei Y6S 2019",
  "Huawei Y9 Prime 2019",
  "Huawei Y5 2019",
  "Huawei Y7 2019",
  "Huawei Y6 2019",
  "Huawei Y6 Pro 2019",
  "Huawei Y7 Pro 2019",
  "Huawei Y7 Prime 2019",
  "Huawei Y9 2019",
  "Huawei Y6 Prime 2018",
  "Huawei Y6 2018",
  "Huawei Y6 2020",
  "Huawei Y7 2018",
  "Huawei Y7 Prime 2018",
  "Huawei Y9 2018",
  "Huawei Y7",
  "Huawei Y6 2017",
  "Huawei Y3 2017",
  "Huawei Y5 2017",
  "Huawei Y6 Pro",
  "Huawei Y6",
];

const HUAWEI_HONOR_SERIES_MODELS = [
  "Huawei Honor Play",
  "Huawei Honor 6",
  "Huawei Honor 6A",
  "Huawei Honor 6C",
  "Huawei Honor 6X",
  "Huawei Honor 7",
  "Huawei Honor 7X",
  "Huawei Honor 7A",
  "Huawei Honor Magic 7 Lite",
  "Huawei Honor X 7C",
  "Huawei Honor 8",
  "Huawei Honor 8X",
  "Huawei Honor X8 B",
  "Huawei Honor 9X",
  "Huawei Honor 9X PRO",
  "Huawei Honor 10 Lite",
  "Huawei Honor 20",
  "Huawei Honor 20 LITE",
  "Huawei Honor 20 PRO",
  "Huawei Honor 30",
  "Huawei Honor 30I",
  "Huawei Honor 30 LITE",
  "Huawei Honor 50",
  "Huawei Honor 50 LITE",
  "Huawei Honor 70",
  "Huawei Honor 70 Pro",
  "Huawei Honor 70 Pro Plus",
  "Honor 70 LITE",
  "Huawei Honor VIEW 8",
  "Huawei Honor VIEW 10",
  "Huawei Honor VIEW 10 LITE",
  "Huawei Honor VIEW 20",
  "Huawei Honor V10",
  "Huawei Honor V20",
  "Huawei Honor V30",
  "Huawei Honor X5 4G",
  "Huawei Honor X5B",
  "Huawei Honor X6",
  "Huawei Honor X6A",
  "Huawei Honor X6B",
  "Huawei Honor X7",
  "Huawei Honor X7A",
  "Huawei Honor X7B",
  "Huawei Honor X7C",
  "Huawei Honor X8",
  "Huawei Honor Magic 4 LITE",
  "Huawei Honor Magic 4 PRO",
  "Huawei Honor Magic 5 LITE",
  "Huawei Honor Magic 5 PRO",
  "Huawei Honor Magic 6 LITE/Honor X50",
  "Huawei Honor Magic 6 PRO",
  "Huawei Honor X6S",
  "Huawei Honor Play 4T PRO",
  "Huawei Honor 200 5G",
  "Huawei Honor 200 Lite 5G",
  "Huawei Honor 200 Smart",
  "Huawei Honor 200 Pro",
  "Huawei Honor 200 Lite",
  "Huawei Honor 400 Pro",
  "Huawei Honor 400 Lite",
  "Huawei Honor 400",
  "Huawei Honor 400 Smart",
];

const HUAWEI_MATE_SERIES_MODELS = [
  "Huawei Mate 30",
  "Huawei Mate 30 Lite",
  "Huawei Mate 30 Pro",
  "Huawei Mate 20X",
  "Huawei Mate 20 Pro",
  "Huawei Mate 20",
  "Huawei Mate 20 Lite",
  "Huawei Mate 10 Lite",
  "Huawei Mate 10 Pro",
  "Huawei Mate 10",
  "Huawei Mate 9 Pro",
  "Huawei Mate 9",
  "Huawei Mate 9 Lite",
];

const HUAWEI_NOVA_SERIES_MODELS = [
  "Huawei Nova 12 SE",
  "Huawei Nova 12s",
  "Huawei Nova 12i",
  "Huawei Nova 12",
  "Huawei Nova 12 Pro",
  "Huawei Nova 12 Ultra",
  "Huawei Nova 11 Pro",
  "Huawei Nova Y91",
  "Huawei nova 11i",
  "Huawei nova 11",
  "Huawei nova 11 SE",
  "Huawei nova 10 SE",
  "Huawei nova Y61",
  "Huawei nova 10 Pro",
  "Huawei nova 10",
  "Huawei nova Y90",
  "Huawei nova Y70",
  "Huawei nova 9 SE",
  "Huawei nova 9",
  "Huawei Nova Y60",
  "Huawei nova 8",
  "Huawei nova 7 SE",
  "Huawei Nova 8i",
  "Huawei nova 7 5G",
  "Huawei Nova 7i",
  "Huawei Nova 5T",
  "Huawei nova 5 Pro",
  "Huawei Nova 5i",
  "Huawei nova 4e",
  "Huawei nova 4",
  "Huawei Nova 3",
  "Huawei Nova 3i",
  "Huawei Nova 2",
  "Huawei Nova 2 Plus",
  "Huawei Nova",
];

const ONEPLUS_SERIES_MODELS = [
  "OnePlus 13R",
  "OnePlus 13",
  "OnePlus 12R",
  "OnePlus 12",
  "OnePlus 11R",
  "OnePlus Open",
  "OnePlus 11",
  "OnePlus 10T 5G",
  "OnePlus 10 Pro",
  "OnePlus 9RT 5G",
  "OnePlus 9R",
  "OnePlus 9 Pro",
  "OnePlus 9",
  "Oneplus 8T",
  "Oneplus 8T Pro",
  "Oneplus 8 Pro",
  "Oneplus 8",
  "OnePlus 7T Pro",
  "OnePlus 7T Pro 5G McLaren",
  "OnePlus 7T",
  "OnePlus 7 Pro 5G",
  "OnePlus 7",
  "OnePlus 7 Pro",
  "Oneplus 6T Mclaren",
  "OnePlus 6T",
  "OnePlus 6",
  "OnePlus 5T",
  "OnePlus 5",
  "OnePlus 3T",
  "OnePlus 3",
  "OnePlus X",
  "OnePlus 2",
  "OnePlus One",
];

const ONEPLUS_NORD_SERIES_MODELS = [
  "OnePlus 11",
  "OnePlus Nord CE4 Lite",
  "OnePlus Nord 4",
  "OnePlus Nord 3 5G",
  "OnePlus Nord N30",
  "OnePlus Nord CE 3 Lite 5G",
  "OnePlus Nord N20 SE",
  "OnePlus Nord N300",
  "OnePlus Nord N20 5G",
  "OnePlus Nord CE 2 Lite 5G",
  "OnePlus Nord 2T 5G",
  "OnePlus Nord CE 2 5G",
  "OnePlus Nord N200 5G",
  "OnePlus Nord CE 5G",
  "OnePlus Nord N10 5G",
  "OnePlus Nord N100",
  "OnePlus Nord",
];

const MOTOROLA_SERIES_MODELS = [
  "Motorola G 5G",
  "Motorola G 5G PLUS",
  "Motorola G PLAY 2021 XT2093",
  "Motorola G5S",
  "Motorola G5S PLUS",
  "Motorola G6 PLAY",
  "Motorola G6 PLUS",
  "Motorola G7 POWER",
  "Motorola G7 PLAY XT1952",
  "Motorola G7 XT1962 / G7 PLUS XT1965",
  "Motorola G8",
  "Motorola G8 PLUS XT2019",
  "Motorola G8 POWER XT2041",
  "Motorola G8 PLAY XT2015-2 / ONE MARCO",
  "Motorola G9 POWER XT2091-3",
  "Motorola G9 PLUS",
  "Motorola G04 / G24 / G24 Power",
  "Motorola G10 XT2127-2 / G30",
  "Motorola G13",
  "Motorola G14 / G54",
  "Motorola G20 XT2128-1 / XT2128-2",
  "Motorola E32 / E32S",
  "Motorola E30 (XT2158-6 XT2159-2)",
  "Motorola ONE / P30 PLAY / XT1941",
  "Motorola ONE FUSION",
  "Motorola ONE FUSION PLUS",
  "Motorola MOTO ONE ACTION",
  "Motorola EDGE 20 / EDGE 20 PRO",
  "Motorola EDGE 30 FUSION",
  "Motorola EDGE 20 LITE",
  "Motorola ONE HYPER XT2027-1",
  "Motorola EDGE 50",
  "Motorola EDGE 50 NEO",
  "Motorola EDGE 50 PRO",
  "Motorola EDGE 50 FUSION",
  "Motorola EDGE 50 ULTRA",
  "Motorola G53 5G",
  "Motorola G51 5G / G60 / G60S XT2133-2",
  "Motorola G50 4G XT2137-1 / XT2137-2",
  "Motorola G34 5G XT2363-2",
  "Motorola G31 / G41 / G71 5G",
  "Motorola MOTO G23",
  "Motorola MOTO E22 / E22i (XT2239)",
  "Motorola E20 (XT-2155 / XT2155-3)",
  "Motorola E15",
  "Motorola E14 (2024)",
  "Motorola E13 4G (2023)",
  "Motorola E7 PLUS / G9 PLAY",
  "Motorola E7 POWER",
  "Motorola E7 / E7 2020",
  "Motorola E6 PLUS",
  "Motorola E5",
  "Motorola G200 5G",
  "Motorola G100",
  "Motorola G85 5G",
  "Motorola G84 5G",
  "Motorola G73 5G",
  "Motorola G62 5G",
  "Motorola G52 XT2221",
  "Motorola G50 5G XT2149-1",
  "Motorola G42",
  "Motorola G32",
  "Motorola G30 XT2129-1 / XT2129-2",
  "Motorola G22 / E32S / E32",
];

const ALCATEL_SERIES_MODELS = [
  "Alcatel 1B 2022 5031",
  "Alcatel 1L Pro 2021",
  "Alcatel 1 2021",
  "Alcatel 1V 2021",
  "Alcatel 1L 2021",
  "Alcatel 1S 2021",
  "Alcatel 1SE 2020",
  "Alcatel 1 2019",
  "Alcatel 1S 2020",
  "Alcatel 1V 2020",
  "Alcatel 1B 2020",
  "Alcatel 1v 2019",
  "Alcatel 1s",
  "Alcatel 1c 2019",
  "Alcatel 1x 2019",
  "Alcatel 1X",
  "Alcatel 1",
  "Alcatel 3L 2021",
  "Alcatel 3X 2020",
  "Alcatel 3L 2020",
  "Alcatel 3v 2019",
  "Alcatel 3L 2019",
  "Alcatel 3x 2019",
  "Alcatel 3C 2019",
  "Alcatel 3 2019",
  "Alcatel 3L",
  "Alcatel 3V",
  "Alcatel 3X",
  "Alcatel 3",
  "Alcatel 3C",
  "Alcatel Pop 4 Plus",
  "Alcatel Pop 4",
  "Alcatel One Touch Pop 2 4.5",
  "Alcatel Pop Icon",
  "Alcatel Pop C9",
  "Alcatel Pop C7",
  "Alcatel Pop C5",
  "Alcatel Pixi 4 (5) 4G",
  "Alcatel Pixi 4 (5) 3G",
  "Alcatel Pixi 4 (6) 3G",
  "Alcatel Pixi 4 (4)",
  "Alcatel Pixi 3 (10)",
  "Alcatel idol X",
  "Alcatel Idol 4S",
  "Alcatel Idol 5",
  "Alcatel Idol 4",
  "Alcatel Idol 3 (5.5) 6045",
  "Alcatel Idol Mini",
  "Alcatel Idol 2 Mini S",
  "Alcatel Idol 2S",
  "Alcatel Idol Ultra",
  "Alcatel Idol",
  "Alcatel Go Flip 4",
  "Alcatel 5V",
  "Alcatel 5",
  "Alcatel A3 Plus 3G",
  "Alcatel A30 Fierce",
  "Alcatel A7 XL",
  "Alcatel A7",
  "Alcatel Flash 2017",
  "Alcatel A5 LED",
  "Alcatel A3 XL",
  "Alcatel U5",
  "Alcatel Shine Lite",
  "Alcatel One Touch Hero 2C",
  "Alcatel One Touch Fierce",
  "Alcatel Flash Plus",
  "Alcatel OneTouch Pop 8",
  "Alcatel Hero",
];

const TCL_SERIES_MODELS = [
  "TCL 60 5G",
  "TCL 50 5G",
  "TCL 50 SE",
  "TCL 50 XL",
  "TCL 40 NXTPAPER T612B",
  "TCL 40 NXTPAPER (5G)",
  "TCL 50 NXTPAPER (4G/5G)",
  "TCL 50 SE (4G)",
  "TCL 50 Pro NXTPAPER",
  "TCL 40R 5G (T771K)",
  "TCL 40 SE",
  "TCL 30 SE 6165",
  "TCL 30E",
  "TCL 305",
  "TCL 306",
  "TCL 30 (T776H T676H 4G/5G)",
  "TCL N30 PLUS",
  "TCL 20 SE 2021 (T671H)",
  "TCL 20L",
  "TCL 20 LITE",
  "TCL 20S",
  "TCL 20 LITE PLUS (T773 / T774H / T774B",
  "TCL 20Y",
  "TCL 20E 6125F",
  "TCL 507",
  "TCL 20 XE",
  "TCL 30 XE 5G",
  "TCL 20R 5G",
  "TCL 20 5G (T781)",
  "TCL 10 SE (T766H / T766J / T766U)",
  "TCL 10L",
  "TCL 10 LITE (T770)",
  "TCL 10 PLUS",
  "TCL 10 5G",
  "TCL 505",
  "TCL 405",
  "TCL 406",
  "TCL 408 (T506D)",
  "TCL 403",
  "TCL 305i",
  "TCL 205",
  "TCL 509K",
  "TCL 605",
];

export default function Navbar() {
  const [location] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems: cartCount, clearCart } = useCart();
  const { user, logout } = useAuth();
  const { keys: compareKeys } = useCompare();
  const { keys: wishlistKeys } = useWishlist();
  const { categories: wooCategories } = useProductCatalog();
  const [activeBrandIdx, setActiveBrandIdx] = useState(0);
  const [activeFamilyIdx, setActiveFamilyIdx] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const handleMouseEnter = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(key as DropdownKey);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const closeMenu = () => setOpenDropdown(null);

  const handleLogout = () => {
    clearCart();
    logout();
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const fallbackBrandGroups = useMemo<NavBrandGroup[]>(() => {
    const brands = smartphonesColumns.flatMap((col) => col.items);
    return brands.map((b) => {
      const base = b.label.replace(/\s*Parts$/i, "").trim();
      const isIphone = base.toLowerCase() === "iphone";
      return {
        brand: { label: base, slug: b.slug },
        items: isIphone
          ? [
              {
                label: "iPhones",
                slug: "iphones",
                children: makeFamilyChildren(b.slug, "iphones", IPHONE_MODELS),
              },
              {
                label: "iPad",
                slug: "ipad",
                children: makeFamilyChildren(b.slug, "ipad", IPAD_MODELS),
              },
              {
                label: "iWatch",
                slug: "iwatch",
                children: makeFamilyChildren(b.slug, "iwatch", IWATCH_MODELS),
              },
            ]
          : base.toLowerCase() === "samsung"
            ? [
                {
                  label: "A series",
                  slug: "a-series",
                  children: makeFamilyChildren(b.slug, "a-series", SAMSUNG_A_SERIES_MODELS),
                },
                {
                  label: "S series",
                  slug: "s-series",
                  children: makeFamilyChildren(b.slug, "s-series", SAMSUNG_S_SERIES_MODELS),
                },
                {
                  label: "Z series",
                  slug: "z-series",
                  children: makeFamilyChildren(b.slug, "z-series", SAMSUNG_Z_SERIES_MODELS),
                },
                {
                  label: "M series",
                  slug: "m-series",
                  children: makeFamilyChildren(b.slug, "m-series", SAMSUNG_M_SERIES_MODELS),
                },
                {
                  label: "J series",
                  slug: "j-series",
                  children: makeFamilyChildren(b.slug, "j-series", SAMSUNG_J_SERIES_MODELS),
                },
                {
                  label: "Note series",
                  slug: "note-series",
                  children: makeFamilyChildren(b.slug, "note-series", SAMSUNG_NOTE_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "xiaomi"
            ? [
                {
                  label: "Redmi series",
                  slug: "redmi-series",
                  children: makeFamilyChildren(b.slug, "redmi-series", XIAOMI_REDMI_SERIES_MODELS),
                },
                {
                  label: "Redmi Note series",
                  slug: "redmi-note-series",
                  children: makeFamilyChildren(b.slug, "redmi-note-series", XIAOMI_REDMI_NOTE_SERIES_MODELS),
                },
                {
                  label: "Mi series",
                  slug: "mi-series",
                  children: makeFamilyChildren(b.slug, "mi-series", XIAOMI_MI_SERIES_MODELS),
                },
              ]
          : base.toLowerCase().includes("oppo")
            ? [
                {
                  label: "Reno series",
                  slug: "reno-series",
                  children: makeFamilyChildren(b.slug, "reno-series", OPPO_RENO_SERIES_MODELS),
                },
                {
                  label: "A series",
                  slug: "a-series",
                  children: makeFamilyChildren(b.slug, "a-series", OPPO_A_SERIES_MODELS),
                },
                {
                  label: "F series",
                  slug: "f-series",
                  children: makeFamilyChildren(b.slug, "f-series", OPPO_F_SERIES_MODELS),
                },
                {
                  label: "Find X series",
                  slug: "find-x-series",
                  children: makeFamilyChildren(b.slug, "find-x-series", OPPO_FIND_X_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "realme"
            ? [
                {
                  label: "C series",
                  slug: "c-series",
                  children: makeFamilyChildren(b.slug, "c-series", REALME_C_SERIES_MODELS),
                },
                {
                  label: "Series",
                  slug: "series",
                  children: makeFamilyChildren(b.slug, "series", REALME_NUMBER_SERIES_MODELS),
                },
                {
                  label: "Narzo series",
                  slug: "narzo-series",
                  children: makeFamilyChildren(b.slug, "narzo-series", REALME_NARZO_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "huawei"
            ? [
                {
                  label: "P series",
                  slug: "p-series",
                  children: makeFamilyChildren(b.slug, "p-series", HUAWEI_P_SERIES_MODELS),
                },
                {
                  label: "Y series",
                  slug: "y-series",
                  children: makeFamilyChildren(b.slug, "y-series", HUAWEI_Y_SERIES_MODELS),
                },
                {
                  label: "Honor series",
                  slug: "honor-series",
                  children: makeFamilyChildren(b.slug, "honor-series", HUAWEI_HONOR_SERIES_MODELS),
                },
                {
                  label: "Mate series",
                  slug: "mate-series",
                  children: makeFamilyChildren(b.slug, "mate-series", HUAWEI_MATE_SERIES_MODELS),
                },
                {
                  label: "Nova series",
                  slug: "nova-series",
                  children: makeFamilyChildren(b.slug, "nova-series", HUAWEI_NOVA_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "one plus"
            ? [
                {
                  label: "OnePlus series",
                  slug: "oneplus-series",
                  children: makeFamilyChildren(b.slug, "oneplus-series", ONEPLUS_SERIES_MODELS),
                },
                {
                  label: "OnePlus Nord series",
                  slug: "oneplus-nord-series",
                  children: makeFamilyChildren(b.slug, "oneplus-nord-series", ONEPLUS_NORD_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "motorola"
            ? [
                {
                  label: "Motorola series",
                  slug: "motorola-series",
                  children: makeFamilyChildren(b.slug, "motorola-series", MOTOROLA_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "alcatel"
            ? [
                {
                  label: "Alcatel series",
                  slug: "alcatel-series",
                  children: makeFamilyChildren(b.slug, "alcatel-series", ALCATEL_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "tcl"
            ? [
                {
                  label: "TCL series",
                  slug: "tcl-series",
                  children: makeFamilyChildren(b.slug, "tcl-series", TCL_SERIES_MODELS),
                },
              ]
          : [
              { label: `${base} Parts`, slug: b.slug },
              { label: `${base} Accessories`, slug: `accessories-${b.slug}` },
              { label: `${base} Chargers`, slug: `chargers-${b.slug}` },
              { label: `${base} Screens`, slug: `screens-${b.slug}` },
            ],
      };
    });
  }, []);

  const brandGroups = useMemo(() => {
    const apiGroups = buildWooBrandGroups(wooCategories);
    const apiBySlug = new Map(apiGroups.map((g) => [g.brand.slug, g]));
    const apiByName = new Map(apiGroups.map((g) => [g.brand.label.toLowerCase(), g]));

    // Keep brand list fixed (as requested), but pull live subcategories from API when available.
    return fallbackBrandGroups.map((fb) => {
      const fallbackNested = fb.items.some((item) => (item.children?.length ?? 0) > 0);
      if (fallbackNested) return fb;

      const bySlug = apiBySlug.get(fb.brand.slug);
      if (bySlug && bySlug.items.length > 0) {
        return { ...fb, items: bySlug.items };
      }
      const byName = apiByName.get(fb.brand.label.toLowerCase());
      if (byName && byName.items.length > 0) {
        return { ...fb, items: byName.items };
      }
      return fb;
    });
  }, [wooCategories, fallbackBrandGroups]);

  const activeBrand = brandGroups[activeBrandIdx] ?? brandGroups[0] ?? null;
  const hasNestedFamilies = (activeBrand?.items ?? []).some((item) => (item.children?.length ?? 0) > 0);
  const activeFamily = hasNestedFamilies
    ? activeBrand?.items[activeFamilyIdx] ?? activeBrand?.items[0]
    : null;

  useEffect(() => {
    setActiveFamilyIdx(0);
  }, [activeBrandIdx]);

  const navLinks = [
    { label: t("nav_home"), href: "/" },
    { label: t("nav_accessories"), href: "/accessories", dropdown: "accessories" },
    { label: t("nav_smartphones"), href: "/smartphones" },
    { label: t("nav_cards"), href: "/cards", dropdown: "cards" },
    { label: t("nav_new"), href: "/new" },
    { label: t("nav_multibrand"), href: "/multi-brand" },
    { label: t("nav_contact"), href: "/contact" },
  ];

  const dropdownColumns: Record<string, typeof accessoriesColumns> = {
    accessories: accessoriesColumns,
    cards: cardsColumns,
  };

  return (
    <header className="w-full z-50 sticky top-0 shadow-md">
      {/* Top bar */}
      <div className="bg-background border-b border-border">
        <div className={`${navShell} py-1.5 flex items-center justify-between`}>
          <p className="text-xs text-muted-foreground hidden sm:block">{t("welcome")}</p>
          <div className="flex items-center gap-3 ml-auto">
            <a href="tel:+351937119295" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> {t("phone")}
            </a>
            {user ? (
              <>
                <Link
                  href="/account"
                  className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors max-w-[140px]"
                >
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("auth_logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <User className="w-3 h-3" /> {t("registration")}
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <LogIn className="w-3 h-3" /> {t("login")}
                </Link>
              </>
            )}
            {/* Language toggle */}
            <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="lang-en"
              >
                EN
              </button>
              <button
                onClick={() => setLang("pt")}
                className={`px-2 py-0.5 transition-colors ${lang === "pt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="lang-pt"
              >
                PT
              </button>
            </div>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Logo + search + cart row */}
      <div className="bg-background border-b border-border">
        <div className={`${navShell} py-3 flex items-center gap-4 md:gap-8`}>
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display font-bold text-2xl md:text-3xl text-primary leading-none">sam</span>
            <span className="font-display font-bold text-2xl md:text-3xl text-foreground leading-none">phone</span>
          </Link>

          <div className="flex-1 hidden md:block min-w-0">
            <SmartSearch />
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <Link
              href="/compare"
              className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="relative inline-flex">
                <GitCompare className="w-4 h-4" />
                {compareKeys.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                    {compareKeys.length}
                  </span>
                )}
              </span>
              {t("compare")}
            </Link>
            <Link
              href="/wishlist"
              className="relative hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="relative inline-flex">
                <Heart className="w-4 h-4" />
                {wishlistKeys.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {wishlistKeys.length > 99 ? "99+" : wishlistKeys.length}
                  </span>
                )}
              </span>
              {t("wishlist")}
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="relative inline-flex">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-4 h-4 px-0.5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">{t("nav_cart")}</span>
            </Link>
            <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main nav bar - blue */}
      <nav className="bg-primary hidden md:block">
        <div className={navShell}>
          <div className="flex items-stretch gap-1 lg:gap-2">
            {/* All Categories */}
            <div
              className="relative shrink-0"
              onMouseEnter={() => handleMouseEnter("allCategories")}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-2 bg-accent px-5 py-3.5 text-accent-foreground font-semibold text-sm cursor-pointer hover:bg-accent/90 transition-colors h-full">
                <Menu className="w-4 h-4" />
                <span>{t("allCategories")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
              <AnimatePresence>
                {openDropdown === "allCategories" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="hide-dropdown-scrollbar absolute top-full left-0 z-50 max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain bg-background border border-border shadow-2xl rounded-b-xl min-w-[min(560px,94vw)] max-w-[min(1100px,96vw)] p-6"
                    onMouseEnter={() => {
                      if (closeTimer.current) clearTimeout(closeTimer.current);
                      if (activeBrandIdx >= brandGroups.length) setActiveBrandIdx(0);
                    }}
                    onMouseLeave={handleMouseLeave}
                  >
                    <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider mb-4 pb-2 border-b border-border">
                      {wooCategories.length > 0
                        ? lang === "pt"
                          ? "Marcas e categorias"
                          : "Brands and categories"
                        : `${t("nav_smartphones")} — ${lang === "pt" ? "Marcas e categorias" : "Brands and categories"}`}
                    </h4>
                    <div className="flex gap-6 items-start min-w-0">
                      <div className="shrink-0 w-[min(200px,26vw)] border-r border-border pr-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60 mb-2">
                          {lang === "pt" ? "Marcas" : "Brands"}
                        </p>
                        <ul className="space-y-1.5">
                          {brandGroups.map((group, idx) => (
                            <li key={group.brand.slug}>
                              <button
                                type="button"
                                onMouseEnter={() => setActiveBrandIdx(idx)}
                                onFocus={() => setActiveBrandIdx(idx)}
                                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                                  idx === activeBrandIdx
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                <span className="truncate">{group.brand.label}</span>
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60 mb-2">
                          {activeBrand?.brand.label ?? (lang === "pt" ? "Categorias" : "Categories")}
                        </p>
                        {hasNestedFamilies ? (
                          <div className="flex gap-5 items-start min-h-0">
                            <div
                              className="shrink-0 w-max min-w-[7.5rem] max-w-[14rem] border-r border-border pr-3"
                              onMouseEnter={() => {
                                if (closeTimer.current) clearTimeout(closeTimer.current);
                              }}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60 mb-2">
                                {lang === "pt" ? "Tipo" : "Type"}
                              </p>
                              <div className="flex flex-col gap-1">
                                {(activeBrand?.items ?? []).map((family, idx) => (
                                  <button
                                    key={`${activeBrand?.brand.slug}-${family.slug}`}
                                    type="button"
                                    onMouseEnter={() => setActiveFamilyIdx(idx)}
                                    onFocus={() => setActiveFamilyIdx(idx)}
                                    className={`max-w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors whitespace-normal break-words ${
                                      idx === activeFamilyIdx
                                        ? "bg-primary/10 text-primary"
                                        : "text-foreground/75 hover:bg-muted hover:text-foreground"
                                    }`}
                                  >
                                    {family.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div
                              className="hide-dropdown-scrollbar flex-1 min-w-0 max-h-[min(58vh,480px)] overflow-y-auto overscroll-contain pl-0.5"
                              onMouseEnter={() => {
                                if (closeTimer.current) clearTimeout(closeTimer.current);
                              }}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60 mb-2">
                                {lang === "pt" ? "Modelos" : "Models"}
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {(activeFamily?.children ?? []).map((model, midx) => (
                                  <Link
                                    key={`${activeBrand?.brand.slug}-${activeFamily?.slug}-${midx}-${model.slug}`}
                                    href={
                                      model.href ??
                                      `/model/${catalogBrandForModelRoutes(activeBrand?.brand.slug ?? "")}/${activeFamily?.slug}/${model.slug}`
                                    }
                                    onClick={closeMenu}
                                    className="text-sm text-foreground/75 hover:text-primary transition-colors block py-1 break-words"
                                  >
                                    {model.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-1.5">
                            {(activeBrand?.items ?? []).map((item) => (
                              <Link
                                key={`${activeBrand?.brand.slug}-${item.slug}`}
                                href={item.href ?? `/category/${item.slug}`}
                                onClick={closeMenu}
                                className="text-sm text-foreground/75 hover:text-primary transition-colors block py-1"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nav links */}
            <div className="flex items-stretch flex-1 min-w-0 justify-start">
              {navLinks.map((link) => (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => link.dropdown ? handleMouseEnter(link.dropdown) : undefined}
                  onMouseLeave={link.dropdown ? handleMouseLeave : undefined}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 px-3 lg:px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors text-primary-foreground hover:bg-primary-foreground/10 ${location === link.href ? "bg-primary-foreground/15" : ""}`}
                  >
                    {link.label}
                    {link.dropdown && <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </Link>

                  <AnimatePresence>
                    {link.dropdown && openDropdown === link.dropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 z-50 bg-background border border-border shadow-2xl rounded-b-xl min-w-[600px] p-6"
                        onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className={`grid gap-6 ${dropdownColumns[link.dropdown].length >= 4 ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-3"}`}>
                          {dropdownColumns[link.dropdown].map((col) => (
                            <div key={col.title}>
                              <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider mb-3 pb-2 border-b border-border">{col.title}</h4>
                              <ul className="space-y-2">
                                {col.items.map((item) => (
                                  <li key={item.slug}>
                                    <Link href={`/category/${item.slug}`} onClick={closeMenu} className="text-sm text-foreground/70 hover:text-primary transition-colors block">
                                      {item.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-5 sm:px-8 py-4 flex flex-col gap-1 max-w-[1600px] mx-auto">
              <div className="mb-3">
                <SmartSearch compact />
              </div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold">
                  <button onClick={() => setLang("en")} className={`px-2 py-0.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
                  <button onClick={() => setLang("pt")} className={`px-2 py-0.5 ${lang === "pt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>PT</button>
                </div>
                <button onClick={toggleTheme} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
              <div className="flex flex-col gap-1 mb-3 border-b border-border pb-3">
                {user ? (
                  <>
                    <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted">
                      <User className="w-4 h-4" /> {t("auth_my_account")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted text-left"
                    >
                      {t("auth_logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted">
                      <User className="w-4 h-4" /> {t("registration")}
                    </Link>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted">
                      <LogIn className="w-4 h-4" /> {t("login")}
                    </Link>
                  </>
                )}
              </div>
              <div className="mb-2 flex flex-col gap-1 border-b border-border pb-3">
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> {t("nav_cart")}
                  </span>
                  {cartCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{cartCount > 99 ? "99+" : cartCount}</span>
                  )}
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4" /> {t("wishlist")}
                  </span>
                  {wishlistKeys.length > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{wishlistKeys.length}</span>
                  )}
                </Link>
                <Link
                  href="/compare"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4" /> {t("compare")}
                  </span>
                  {compareKeys.length > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{compareKeys.length}</span>
                  )}
                </Link>
              </div>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  {link.label}
                  {link.dropdown && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
