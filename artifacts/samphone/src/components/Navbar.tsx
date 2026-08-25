import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Heart, Phone, ChevronDown, Search, Gift, Globe, Repeat2 } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import { motion, AnimatePresence } from "framer-motion";
import AccessoryPageButtons from "@/components/AccessoryPageButtons";
import { smartphonesColumns } from "@/data/categories";
import {
  APPLE_IPHONE_MODELS,
  APPLE_WATCH_MODELS,
  APPLE_IPAD_PRO_MODELS,
  APPLE_IPAD_MINI_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_IPAD_AIR_MODELS,
  APPLE_MACBOOK_MODELS,
  APPLE_NEW_MODELS,
} from "@/data/nav-apple";
import { NAV_OTHER_BRANDS } from "@/data/nav-others";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { buildWooBrandGroups, type NavBrandGroup } from "@/lib/woo-category-nav";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang, LANG_OPTIONS } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { useWishlist } from "@/contexts/WishlistContext";
import SmartSearch from "@/components/SmartSearch";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

type DropdownKey = "accessories" | "cards" | "brands" | "others" | "categories" | null;

function displayBrandLabel(label: string): string {
  const key = label.toLowerCase();
  if (key === "iphone") return "Apple";
  if (key === "one plus") return "OnePlus";
  if (key === "oppo reno") return "Oppo";
  return label;
}

function HeaderAction({
  href,
  onClick,
  icon,
  label,
  badge,
  testId,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  testId?: string;
}) {
  const inner = (
    <>
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        {icon}
        {badge}
      </span>
      <span className="max-w-[4.85rem] text-center text-[11px] font-medium leading-tight">{label}</span>
    </>
  );
  const className =
    "flex min-w-[3.6rem] flex-col items-center gap-1 text-white/70 transition-opacity hover:text-white";
  if (href) {
    return (
      <Link href={href} className={className} data-testid={testId} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className} data-testid={testId} onClick={onClick}>
      {inner}
    </button>
  );
}

function CountBadge({
  count,
  tone = "primary",
  showZero = false,
}: {
  count: number;
  tone?: "primary" | "danger";
  showZero?: boolean;
}) {
  if (!showZero && count <= 0) return null;
  return (
    <span
      className={`absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold ${
        tone === "danger" ? "bg-sam text-white" : "bg-brand text-white"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Shared horizontal inset so top bar, logo row, and blue nav align and do not hug the viewport edges */
const navShell =
  "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

// BrandIcon removed: brand tabs are text-only in the white bar

function slugifyModelLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isNewNavModel(label: string) {
  if (APPLE_NEW_MODELS.has(label)) return true;
  if (/^(iPhone |iPad |Series |Ultra |Air |Pro |13"|12'')/i.test(label)) return false;
  return /\b(2025|2026)\b/i.test(label);
}

/** Map Woo / nav category slug (e.g. iphone-parts) to :brand segment used by ModelCatalogPage. */
function catalogBrandForModelRoutes(partsSlug: string): string {
  const s = partsSlug.toLowerCase();
  if (s === "iphone-parts") return "iphone";
  if (s === "samsung-parts") return "samsung";
  if (s === "honor-parts") return "honor";
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

const OPPO_FIND_X_SERIES_MODELS = [
  "Find X9 Pro",
  "Find X9",
  "Find X8 Pro",
  "Find X8",
  "Find X5 Pro",
  "Find X5",
  "Find X5 Lite",
  "Find X3 Pro",
  "Find X3 Neo",
  "Find X3 Lite",
  "Find X2 Neo",
  "Find X2 Lite",
];

const OPPO_RENO_SERIES_MODELS = [
  "Reno15 FS 5G",
  "Reno15 Pro 5G",
  "Reno15 F 5G",
  "Reno15 5G",
  "Reno14 F 5G",
  "Reno14 5G",
  "Reno13 Pro 5G",
  "Reno13 FS 5G",
  "Reno13 F 4G/5G",
  "Reno13 5G",
  "Reno12 Pro 5G",
  "Reno12 FS 5G",
  "Reno12 F 4G/5G",
  "Reno12 5G",
  "Reno10 Pro 5G",
  "Reno10X Zoom",
  "Reno8 Lite 5G",
  "Reno8 5G",
  "Reno7 5G",
  "Reno7 4G",
  "Reno6 Pro 5G",
  "Reno6 5G",
  "Reno4 Pro 5G",
  "Reno4 Z 5G",
  "Reno3 Pro 5G",
  "Reno3 5G",
  "Reno3 4G",
  "Reno2 Z",
  "Reno2",
  "Reno Z",
  "Reno",
];

const OPPO_A_SERIES_MODELS = [
  "A96",
  "A94 5G",
  "A92",
  "A77 5G",
  "A80 5G",
  "A76",
  "A74 5G",
  "A74 4G",
  "A72",
  "A57s",
  "A57",
  "A54S",
  "A54 5G",
  "A53S",
  "A53",
  "A52",
  "A40",
  "A17",
  "A16S",
  "A16",
  "A15",
  "A11s",
  "A9 2020",
  "A5 2020",
  "A6t",
  "A6c",
  "A6x 5G",
  "A6x 4G",
  "A6 Pro 5G",
  "A6 5G",
  "A5 Pro 5G",
  "A5 Pro 4G",
];

const REALME_NUMBER_SERIES_MODELS = [
  "Realme 16 Pro+ 5G",
  "Realme 16 Pro 5G",
  "Realme 14T 5G",
  "Realme 14X 5G",
  "Realme 14 Pro+ 5G",
  "Realme 14 Pro 5G",
  "Realme 14 5G",
  "Realme 13 5G",
  "Realme 13",
  "Realme 12 Pro+",
  "Realme 12 Pro",
  "Realme 12+",
  "Realme 11 Pro+",
  "Realme 11 Pro",
  "Realme 10 5G",
  "Realme 10 4G",
  "Realme 9 Pro+",
  "Realme 9 Pro",
  "Realme 9 5G",
  "Realme 9 4G",
  "Realme 9i",
  "Realme 8 Pro",
  "Realme 8 5G",
  "Realme 8",
  "Realme 8i",
  "Realme 7",
  "Realme 7i",
  "Realme 6",
  "Realme 6i",
  "Realme 5 Pro",
];

const REALME_C_SERIES_MODELS = [
  "C71",
  "C75 5G",
  "C75 4G",
  "C67",
  "C61",
  "C55",
  "C35",
  "C33",
  "C31",
  "C30",
  "C25Y",
  "C21Y",
  "C21",
  "C11 (2021)",
  "C3",
];

const REALME_GT_SERIES_MODELS = [
  "Realme GT 8 Pro",
  "Realme GT 7T",
  "Realme GT 7 Pro",
  "Realme GT 7",
  "Realme GT 6T",
  "Realme GT 6",
  "Realme GT 2 Pro",
  "Realme GT 2",
  "Realme GT Neo 3",
];

const REALME_P_SERIES_MODELS = [
  "P3 Lite 4G",
  "P3 Lite 5G",
];

const REALME_AUTRES_MODELS = [
  "Narzo 50i Prime",
  "Narzo 50A Prime",
  "Narzo 50 4G",
  "Note 50",
  "Note 70T",
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

const HONOR_MAGIC_MODELS = [
  "Honor Magic",
  "Honor Magic8 Pro",
  "Honor Magic8 Lite",
  "Honor Magic7 Pro",
  "Honor Magic7 Lite",
  "Honor Magic6 Pro",
  "Honor Magic6 Lite",
  "Honor Magic5 Pro",
  "Honor Magic5 Lite",
  "Honor Magic4 Pro",
  "Honor Magic4 Lite 5G",
  "Honor Magic4 Lite 4G",
  "Honor Magic V5",
  "Honor Magic V3",
];

const HONOR_N_MODELS = [
  "Honor 600 Smart",
  "Honor 600 Lite",
  "Honor 600 Pro",
  "Honor 600",
  "Honor 400 Smart 5G",
  "Honor 400 Smart 4G",
  "Honor 400 Pro",
  "Honor 400 Lite",
  "Honor 400",
  "Honor 200 Pro",
  "Honor 200",
  "Honor 200 Smart",
  "Honor 200 Lite",
  "Honor 90",
  "Honor 90 Smart",
  "Honor 90 Lite",
  "Honor 70",
  "Honor 70 Lite",
  "Honor 50",
  "Honor 50 Lite",
  "Honor 20 Pro",
  "Honor 20",
  "Honor 20 Lite",
  "Honor 10",
  "Honor 10 Lite",
  "Honor 9X Pro",
  "Honor 9X Lite",
  "Honor 9X",
  "Honor 9A",
  "Honor 9",
  "Honor 9 Lite",
  "Honor 8X",
  "Honor 8S",
  "Honor 8A",
  "Honor 8",
  "Honor 8 Lite",
  "Honor 7X",
  "Honor 7S",
  "Honor 6X",
];

const HONOR_X_MODELS = [
  "Honor X",
  "Honor X8b",
  "Honor X8a",
  "Honor X8 5G",
  "Honor X8",
  "Honor X7b",
  "Honor X7a",
  "Honor X7",
  "Honor X6b",
  "Honor X6a",
  "Honor X6",
];

const HONOR_AUTRES_MODELS = [
  "Honor View 20",
  "Honor View 10",
  "Honor Play",
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
  "OnePlus 15R",
  "OnePlus 15",
  "OnePlus 13R",
  "OnePlus 13",
  "OnePlus 12R",
  "OnePlus 12",
  "OnePlus 11 5G",
  "OnePlus 10T 5G",
  "OnePlus 10 Pro 5G",
  "OnePlus 9 Pro",
  "OnePlus 9",
  "OnePlus 8T",
  "OnePlus 8 Pro",
  "OnePlus 8",
  "OnePlus 7T Pro",
  "OnePlus 7T",
  "OnePlus 7 Pro",
  "OnePlus 7",
  "OnePlus 6T",
  "OnePlus 6",
  "OnePlus 5T",
  "OnePlus 5",
  "OnePlus 3T",
  "OnePlus 3",
];

const ONEPLUS_NORD_SERIES_MODELS = [
  "OnePlus Nord N100",
  "OnePlus Nord N10 5G",
  "OnePlus Nord 5",
  "OnePlus Nord 4",
  "OnePlus Nord 3 5G",
  "OnePlus Nord 2T 5G",
  "OnePlus Nord 2 5G",
  "OnePlus Nord",
  "OnePlus Nord CE5 5G",
  "OnePlus Nord CE4 Lite 5G",
  "OnePlus Nord CE 3 Lite 5G",
  "OnePlus Nord CE 2 5G",
  "OnePlus Nord CE 2 Lite 5G",
  "OnePlus Nord CE 5G",
];

const MOTOROLA_RAZR_MODELS = [
  "Razr 70 Ultra",
  "Razr 70 Plus",
  "Razr 70",
  "Razr 60 Ultra",
  "Razr 60",
  "Razr 50 Ultra",
  "Razr 50",
  "Razr 40 Ultra",
  "Razr 40",
];

const MOTOROLA_EDGE_MODELS = [
  "Edge 70 Fusion",
  "Edge 70 Pro",
  "Edge 70",
  "Edge 60 Fusion",
  "Edge 60 Neo",
  "Edge 60",
  "Edge 50 Ultra",
  "Edge 50 Fusion",
  "Edge 50 Pro",
  "Edge 50",
  "Edge 50 Neo",
  "Edge 40",
  "Edge 40 Neo",
  "Edge 30 Ultra",
  "Edge 30 Fusion",
  "Edge 30",
  "Edge 30 Neo",
  "Edge 20 Lite",
  "Edge 2020",
];

const MOTOROLA_G_MODELS = [
  "G87 5G",
  "G86 Power 5G",
  "G86 5G",
  "G85 5G",
  "G84 5G",
  "G82 5G",
  "G77 5G",
  "G73 5G",
  "G72",
  "G67 5G",
  "G62 5G",
  "G57 Power",
  "G56 5G",
  "G55 5G",
  "G54 5G",
  "G53 5G",
  "G52",
  "G50 (XT2137)",
  "G42",
  "G41",
  "G37 Power",
  "G37",
  "G35 5G",
  "G34 5G",
  "G32",
  "G31",
  "G30",
  "G24",
  "G23",
  "G22",
  "G17 Power",
  "G17",
  "G15",
  "G14",
  "G13",
  "G10",
  "G06 Power",
  "G06",
  "G05",
  "G04s",
  "G04",
  "G 5G Plus",
  "G9 Play",
  "G9 Power",
  "G9 Plus",
  "G8 Power (XT2041-3)",
  "G8 Power Lite (XT2055)",
  "G8 Plus (XT2019)",
];

const MOTOROLA_E_MODELS = [
  "E40",
  "E32s",
  "E32",
  "E22i",
  "E22",
  "E20",
  "E15",
  "E13",
  "E7i Power",
  "E7",
  "E6 Plus",
];

const MOTOROLA_THINKPHONE_MODELS = ["ThinkPhone 25"];

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

const ZTE_SERIES_MODELS = [
  "ZTE A5 2020",
  "ZTE A7 2019",
  "ZTE A7 2020 BLACK",
  "ZTE A31 BLACK",
  "ZTE A31 PLUS BLACK",
  "ZTE A33S",
  "ZTE A34",
  "ZTE BLADE A54",
  "ZTE A51",
  "ZTE A71 BLACK",
  "ZTE BLADE V50 DESIGN 4G",
  "ZTE AXON 60 LITE",
  "ZTE AXON 60",
  "ZTE A7S",
  "ZTE A55",
  "ZTE A56",
  "ZTE A52",
  "ZTE A72 5G BLACK",
  "ZTE A52 LITE BLACK",
  "ZTE A53",
  "ZTE A53 PLUS BLACK",
  "ZTE A53 PRO BLACK",
  "ZTE A72S",
  "ZTE A73 4G",
  "ZTE V50 SMART",
  "ZTE A73 5G",
  "ZTE L210",
  "ZTE BLADE V60 DESIGN",
  "ZTE BLADE V70 DESIGN",
  "ZTE A75 5G",
  "ZTE A75",
  "ZTE A76",
  "ZTE A75 4G",
  "ZTE A36",
  "ZTE V30 VITA BLACK",
  "ZTE BLADE V40",
  "ZTE V30 BLACK",
  "ZTE BLADE V40 DESIGN",
  "ZTE V41 VITA",
  "ZTE V40 VITA",
  "ZTE V40 SMART",
  "ZTE V41 SMART",
  "ZTE A72 4G",
  "ZTE BLADE V50 DESIGN 5G",
  "ZTE V50 VITA",
  "ZTE V60 DESIGN",
  "ZTE V70 MAX",
  "ZTE V70",
  "ZTE V50",
  "ZTE A35",
];

const VIVO_X_SERIES_MODELS = [
  "X200 Pro 5G",
  "X90 Pro 5G",
  "X90 Pro 4G",
  "X60 Pro",
  "X51",
];

const VIVO_Y_SERIES_MODELS = [
  "Y72 5G",
  "Y70",
  "Y52 5G",
  "Y36",
  "Y29S 5G",
  "Y28S 5G",
  "Y28S 4G",
  "Y28 5G",
  "Y28 4G",
  "Y21S",
  "Y21",
  "Y20S",
  "Y17S",
  "Y16",
  "Y11S",
  "Y04",
  "Y03",
];

const VIVO_V_SERIES_MODELS = [
  "V50 Lite 5G",
  "V50 Lite 4G",
  "V50 5G",
  "V50 4G",
  "V40 SE 80W",
  "V40 SE 5G",
  "V40 Lite 5G",
  "V40 5G",
  "V29 Lite 5G",
  "V29 5G",
  "V21 5G",
];

const TABLET_IPADS_MODELS = [
  "iPad Air (A3269/A3271/A3268) 13\" 2025",
  "iPad Air (A3267/A3270/A3266) 11\" 2025",
  "iPad Air (A2899/A2900/A2898) 13\" 2024",
  "iPad Air (A2902/A2903/A2904) 11\" 2024",
  "iPad Air (A2588/A2589/A2591) 10.9\" 2022",
  "iPad Air (A2316/A2324/A2325/A2072) 10.9\" 2020",
  "iPad Air (A2123/A2152/A2153/A2154) 10.5\" 2019",
  "iPad Air 2 (A1566/A1567) 9.7\" 2014",
  "iPad Air (A1474/A1475/A1476) 9.7\" 2013",
  "iPad Air (A3354/A3355/A3356) 11\" 2025",
  "iPad Pro 13 2024/7th(A2925,A2926)",
  "iPad Pro 11 2024/5th(A2836,A2837)",
  "iPad Air 13 2024(A2898,A2899)",
  "iPad Air 11 2024(A2902,A2903)",
  "iPad Pro 12.9 2022/6th(A2436,A2764,A2437)",
  "iPad Pro 11 2022/4th(A2759,A2435,A2761)",
  "iPad 2022/iPad 10th(A2777,A2757,A3162)",
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
  "iPad Mini 2",
  "iPad Air",
  "iPad 4",
  "iPad Mini 1",
  "iPad 3",
  "iPad 2",
];

const TABLET_TCL_MODELS = ["TCL Tab 10 Gen2", "TCL Tab 10L"];
const TABLET_LENOVO_MODELS = [
  "Lenovo Tab M11 TB330/TB331",
  "Lenovo Tab P12 TB370FU/TB371FC Black",
  "Lenovo Tab M8 4th Gen TB-300FU",
  "Lenovo Tab P11 Pro Gen 2 Black",
  "Lenovo Tab M9 TB-310",
  "Lenovo Tab P11 Gen 2 TB-350 Black",
  "Lenovo Tab M10 3rd Gen TB-328FU/TB-328XU Black",
  "Lenovo Tab M10 Plus 3rd Gen TB-125/TB-128",
  "Lenovo Pad Pro TB-J706F",
  "Lenovo Tab M10 5G TB-X607Z",
  "Lenovo Tab M8 3rd Gen TB-8506F/X",
  "Lenovo Tab M7 (2nd Gen) TB-7305F",
  "Lenovo Tab P12 Pro Black",
  "Lenovo Tab P11 5G TB-J607Z",
  "Lenovo Pad Plus TB-J607",
  "Lenovo Tab P11 Plus TB-J616",
  "Lenovo Tab P11 Pro TB-J706 Black",
  "Lenovo Tab P11/11 Plus TB-J606F Black",
  "Lenovo Tab M10 REL TB-X605FC/TB-X605LC",
  "Lenovo Tab M10 HD Gen 2 TB-X306 Black",
  "Lenovo Tab M10 Plus TB-X606 Black",
  "Lenovo Tab M8 TB-8505F Black",
  "Lenovo Tab M8 FHD TB-8705",
  "Lenovo Tab E8 TB-8304F",
  "Lenovo Tab M10 HD TB-X505/TB-X505F Black",
  "Lenovo Tab M10 X605F/X605L/X605M Black",
];
const TABLET_SAMSUNG_MODELS = [
  "Samsung Galaxy Tab A11 8.7 2025 (X133/135)",
  "Samsung Galaxy Tab A11 Plus 11\" 2025 (X230)",
  "Samsung Galaxy Tab S11 ULTRA (X930/X936B)",
  "Samsung Galaxy Tab S10 ULTRA (X920/X926B)",
  "Samsung Galaxy Tab S10 Lite 10.9\"(X400/X406B)",
  "Samsung Galaxy Tab S10 PLUS (X820/X826B)",
  "Samsung Galaxy Tab S10 FE Plus 5G 13.1\"(X620/X626B)",
  "SAMSUNG GALAXY A10.5 T590/T595",
  "Samsung Galaxy Tab Note 10.1 (P600/P605)",
  "Samsung Galaxy Tab S9 FE+(X610/X616B)",
  "Samsung Galaxy Tab S9 FE(X510/X516B)",
  "Samsung Galaxy Tab A9+(X210/X215/X216B)",
  "Samsung Galaxy Tab S9 Ultra(X910/X916B)",
  "Samsung Galaxy Tab A9(X110/X115)",
  "Samsung Galaxy Tab S9+(X810/X816B)",
  "Samsung Galaxy Tab S9(X710/X716B)",
  "Samsung Galaxy Tab S8 Ultra(X900/X906)",
  "Samsung Galaxy Tab S8+(X800/X806)",
  "Samsung Galaxy Tab S8(X700/X706)",
  "Samsung Galaxy Tab A7 10.4 2022(T509)",
  "Samsung Galaxy Tab S6 Lite 2022(P613/P619)",
  "Samsung Galaxy Tab A8 10.5 2021(X200/X205)",
  "Samsung Galaxy Tab A7 Lite(T220/T225)",
  "Samsung Galaxy Tab S7 FE(T730/T733/T736B)",
  "Samsung Galaxy Tab A7 10.4 2020(T500/T505)",
  "Samsung Galaxy Tab S7(T870/T875)",
  "Samsung Galaxy Tab S7+(T970/T976B)",
  "Samsung Galaxy Tab S6 Lite(P610/P615)",
  "Samsung Galaxy Tab S6 Lite 2024 (P620/P625)",
  "Samsung Galaxy Tab S6 5G(T866N)",
  "Samsung Galaxy Tab Active Pro(T545/T547)",
  "Samsung Galaxy Tab S6(T860/T865)",
  "Samsung Galaxy Tab A8.0 2019(T290/T295)",
  "SAMSUNG GALAXY A9 PLUS X210/215",
  "Samsung Galaxy Tab A10.1 2019(T510/T515)",
  "Samsung Galaxy Tab S5e(T720/T725)",
  "Samsung Galaxy Tab A10.5 (T590/T595)",
  "Samsung Galaxy Tab A10.1 2016(T580/T585/P580/P585)",
  "Samsung Galaxy Tab A2016(T280/T285)",
  "Samsung Galaxy Tab S2 9.7(T810/T815/T813N/T819N)",
  "Samsung Galaxy Tab S2 8.0(T710/T713/T715/T719N)",
  "Samsung Galaxy Tab E9.6(T560/T561/T565)",
  "Samsung Galaxy Tab A9.7(T550/T555/P550/P555)",
  "Samsung Galaxy Tab 4 10.1\"(T530)",
  "Samsung Galaxy Tab 3 Lite 7 \"(T113) 2015",
  "Samsung Galaxy Note 10.1 \"(P600/P605) 2014",
];
const TABLET_XIAOMI_MODELS = [
  "Xiaomi Pad SE 8.7",
  "Xiaomi Pad SE 11.0",
  "Xiaomi Pad Pro 12.1",
  "Xiaomi Pad 6S Pro 12.4",
  "Xiaomi Pad 10.61",
  "Xiaomi Pad SE",
  "Xiaomi Pad SE 11.8",
  "Xiaomi Pad 7",
  "Xiaomi Pad 7 Pro",
  "Xiaomi Pad 6",
  "Xiaomi Pad 6 Pro 11(2023)",
  "Xiaomi Redmi Pad",
  "Xiaomi Pad 5/5 Pro 11.0",
];
const TABLET_HUAWEI_MODELS = [
  "Huawei Mate Pad SE 11 Black",
  "Huawei Mate Pad 11.5S Black",
  "Huawei Mate Pad 11 2023",
  "Huawei Mate Pad Pro 13.2 2025 Black",
  "Huawei Mate Pad Pro 13.2",
  "Huawei Mate Pad Pro 12.2 2024 Black",
  "Huawei Mate Pad 12X Black",
  "Huawei Mate Pad Air 2024 Black",
  "Huawei Mate Pad Pro 11",
  "Huawei Mate Pad Pro 10.8 5G 2019",
  "Huawei Mate Pad T10S",
  "Huawei Mate Pad T10 White",
  "Huawei Mate Pad T10 Black",
  "Huawei Media Pad M6 10.8 White",
  "Huawei Media Pad M6 10.8 Black",
  "Huawei Media Pad M5 lite 10.1 (2018) Black",
  "Honor Pad 5 10.1",
  "Huawei Media Pad M5 Lite 8.0",
  "Huawei Media Pad M5 lite 10.1",
  "Huawei Media Pad T5 Black",
  "Huawei Media Pad T5 White",
  "Huawei Media Pad M5 Pro 10.8",
  "Huawei Media Pad M5 8.4 Black",
  "Huawei Media Pad 10.4 (2020)",
  "Huawei Media Pad M3 Lite 8",
  "Huawei Media Pad M3 Lite 10.1 Black",
  "Huawei Media Pad T3 Black",
  "Huawei Media Pad T3 White",
  "Huawei Media Pad T3 8.0",
  "Huawei Honor Pad X8A Black",
  "Huawei Honor Pad SE",
  "Huawei Honor Tab 7 (AGM3-W09HN) 10.1\" (2021)",
];

const NOKIA_SERIES_MODELS = [
  "Nokia X20",
  "Nokia X10",
  "Nokia C20",
  "Nokia C10",
  "Nokia G60",
  "Nokia G50",
  "Nokia G21",
  "Nokia G11",
  "Nokia G10",
  "Nokia 8.3",
  "Nokia 8.1 Plus",
  "Nokia 8.1",
  "Nokia 7.2",
  "Nokia 7.1 Plus",
  "Nokia 7.1",
  "Nokia 7",
  "Nokia 6.2",
  "Nokia 6.1 Plus",
  "Nokia 6.1",
  "Nokia 6",
  "Nokia 5.4",
  "Nokia 5.3",
  "Nokia 5.1 Plus",
  "Nokia 5.1",
  "Nokia 5",
  "Nokia 4.2",
  "Nokia 3.4",
  "Nokia 3.2",
  "Nokia 3.1 Plus",
  "Nokia 3.1",
  "Nokia 3",
  "Nokia 2.4",
  "Nokia 2.3",
  "Nokia 2.1",
];

const GOOGLE_PIXEL_SERIES_MODELS = [
  "Google Pixel 10A",
  "Google Pixel 10 Pro Fold 5G",
  "Google Pixel 10 Pro XL 5G",
  "Google Pixel 10 Pro 5G",
  "Google Pixel 10 4G",
  "Google Pixel 9 Pro Fold",
  "Google Pixel 9 Pro XL",
  "Google Pixel 9 Pro",
  "Google Pixel 9",
  "Google Pixel 9A 5G",
  "Google Pixel 8 Pro",
  "Google Pixel 8A 5G",
  "Google Pixel 8",
  "Google Pixel 7 Pro",
  "Google Pixel 7A 5G",
  "Google Pixel 7 5G",
  "Google Pixel 6A 5G",
  "Google Pixel 6 5G",
  "Google Pixel 6 Pro",
  "Google Pixel 5A 5G",
  "Google Pixel 5",
  "Google Pixel 4A 5G",
];

type NavFamily = NavBrandGroup["items"][number];

function isAppleBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "iphone-parts" || label === "iphone" || label === "apple";
}

function packMegaColumns(brand: NavBrandGroup, families: NavFamily[]): NavFamily[][] {
  if (!isAppleBrand(brand)) return families.map((family) => [family]);
  const bySlug = new Map(families.map((family) => [family.slug, family]));
  const pick = (...slugs: string[]) =>
    slugs.map((slug) => bySlug.get(slug)).filter((family): family is NavFamily => Boolean(family));
  const columns = [
    pick("iphones"),
    pick("iwatch"),
    pick("ipad-pro", "ipad-mini"),
    pick("ipad", "ipad-air"),
    pick("macbook"),
  ].filter((col) => col.length > 0);
  const used = new Set(columns.flat().map((family) => family.slug));
  for (const leftover of families.filter((family) => !used.has(family.slug))) {
    columns.push([leftover]);
  }
  return columns;
}

function BrandMegaPanel({
  brand,
  onClose,
}: {
  brand: NavBrandGroup | null;
  onClose: () => void;
}) {
  if (!brand) return null;
  const families = brand.items.filter((item) => (item.children?.length ?? 0) > 0);
  const looseItems = brand.items.filter((item) => !(item.children?.length ?? 0));
  const brandRoute = catalogBrandForModelRoutes(brand.brand.slug);
  const columns = packMegaColumns(brand, families);
  const manyCols = columns.length >= 5;

  return (
    <div className={`${navShell} py-6`}>
      {families.length > 0 ? (
        <div
          className={`flex flex-wrap overflow-hidden border-x border-t border-black/[0.06] ${
            manyCols ? "" : "justify-center"
          }`}
        >
          {columns.map((column, colIdx) => (
            <div
              key={`${brand.brand.slug}-col-${colIdx}-${column.map((f) => f.slug).join("-")}`}
              className={`flex flex-col gap-8 border-b border-r border-black/[0.06] px-4 py-4 ${
                manyCols
                  ? "w-1/2 sm:w-1/3 xl:w-1/5"
                  : "w-1/2 min-w-0 sm:w-1/3 xl:w-[260px] xl:flex-none"
              }`}
            >
              {column.map((family) => {
                const models = family.children ?? [];
                return (
                <div key={`${brand.brand.slug}-${family.slug}`}>
                  <div className="mb-3 inline-flex rounded-full bg-[#E3EFFA] px-3 py-1 text-[13px] font-medium text-[#1a2b4a]">
                    {family.label}
                  </div>
                  <ul className="space-y-2">
                    {models.map((model, midx) => (
                      <li key={`${family.slug}-${midx}-${model.slug}`}>
                        <Link
                          href={
                            model.href ??
                            `/model/${brandRoute}/${family.slug}/${model.slug}`
                          }
                          onClick={onClose}
                          className="flex items-start gap-2 text-[13px] leading-snug text-[#3d4a5c] transition-colors hover:text-[#5A73A8]"
                        >
                          <span>{model.label}</span>
                          {isNewNavModel(model.label) ? (
                            <span className="mt-0.5 shrink-0 rounded-[3px] bg-[#5A73A8] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                              NEW
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
          {looseItems.map((item) => (
            <Link
              key={item.slug}
              href={item.href ?? `/category/${item.slug}`}
              onClick={onClose}
              className="text-[13px] text-[#3d4a5c] transition-colors hover:text-[#5A73A8]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function OthersMegaPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className={`${navShell} py-2`}>
      <div className="grid grid-cols-2 overflow-hidden border-x border-t border-black/[0.06] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {NAV_OTHER_BRANDS.map((brand) => (
          <div
            key={brand.slug}
            className="border-b border-r border-black/[0.06] px-4 py-4 last:border-r-0"
          >
            <div className="mb-3 inline-flex rounded-full bg-[#EEF1F4] px-3 py-1 text-[13px] font-medium text-[#1a2b4a]">
              {brand.name}
            </div>
            <ul className="space-y-2">
              {brand.models.map((model) => {
                const slug = slugifyModelLabel(model.label);
                return (
                  <li key={`${brand.slug}-${slug}`}>
                    <Link
                      href={`/model/${brand.slug}/models/${slug}`}
                      onClick={onClose}
                      className="flex items-start gap-2 text-[13px] leading-snug text-[#3d4a5c] transition-colors hover:text-[#5A73A8]"
                    >
                      <span>{model.label}</span>
                      {model.isNew ? (
                        <span className="mt-0.5 shrink-0 rounded-[3px] bg-[#5A73A8] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                          NEW
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllCategoriesMegaPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className={`${navShell} py-6`}>
      <AccessoryPageButtons onNavigate={onClose} />
    </div>
  );
}

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>("brands");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { totalItems: cartCount, openCart } = useCart();
  const { user } = useAuth();
  const { keys: compareKeys } = useCompare();
  const { keys: wishlistKeys } = useWishlist();
  const { categories: wooCategories } = useProductCatalog();
  const [activeBrandIdx, setActiveBrandIdx] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const closeMenu = () => {
    setOpenDropdown("brands");
    setMenuOpen(false);
    setDrawerOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
    setOpenDropdown("brands");
  }, [location]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
                label: "iPhone",
                slug: "iphones",
                children: makeFamilyChildren(b.slug, "iphones", APPLE_IPHONE_MODELS),
              },
              {
                label: "Apple Watch",
                slug: "iwatch",
                children: makeFamilyChildren(b.slug, "iwatch", APPLE_WATCH_MODELS),
              },
              {
                label: "iPad Pro",
                slug: "ipad-pro",
                children: makeFamilyChildren(b.slug, "ipad", APPLE_IPAD_PRO_MODELS),
              },
              {
                label: "iPad mini",
                slug: "ipad-mini",
                children: makeFamilyChildren(b.slug, "ipad", APPLE_IPAD_MINI_MODELS),
              },
              {
                label: "iPad",
                slug: "ipad",
                children: makeFamilyChildren(b.slug, "ipad", APPLE_IPAD_MODELS),
              },
              {
                label: "iPad Air",
                slug: "ipad-air",
                children: makeFamilyChildren(b.slug, "ipad", APPLE_IPAD_AIR_MODELS),
              },
              {
                label: "MacBook",
                slug: "macbook",
                children: makeFamilyChildren(b.slug, "macbook", APPLE_MACBOOK_MODELS),
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
                  label: "Série Find X",
                  slug: "find-x-series",
                  children: makeFamilyChildren(b.slug, "find-x-series", OPPO_FIND_X_SERIES_MODELS),
                },
                {
                  label: "Reno Series",
                  slug: "reno-series",
                  children: makeFamilyChildren(b.slug, "reno-series", OPPO_RENO_SERIES_MODELS),
                },
                {
                  label: "A Series",
                  slug: "a-series",
                  children: makeFamilyChildren(b.slug, "a-series", OPPO_A_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "realme"
            ? [
                {
                  label: "Realme",
                  slug: "series",
                  children: makeFamilyChildren(b.slug, "series", REALME_NUMBER_SERIES_MODELS),
                },
                {
                  label: "Realme C",
                  slug: "c-series",
                  children: makeFamilyChildren(b.slug, "c-series", REALME_C_SERIES_MODELS),
                },
                {
                  label: "Realme GT",
                  slug: "gt-series",
                  children: makeFamilyChildren(b.slug, "gt-series", REALME_GT_SERIES_MODELS),
                },
                {
                  label: "Realme P",
                  slug: "p-series",
                  children: makeFamilyChildren(b.slug, "p-series", REALME_P_SERIES_MODELS),
                },
                {
                  label: "Autres",
                  slug: "autres",
                  children: makeFamilyChildren(b.slug, "autres", REALME_AUTRES_MODELS),
                },
              ]
          : base.toLowerCase() === "honor"
            ? [
                {
                  label: "Honor Magic",
                  slug: "magic",
                  children: makeFamilyChildren(b.slug, "magic", HONOR_MAGIC_MODELS),
                },
                {
                  label: "Honor N",
                  slug: "n-series",
                  children: makeFamilyChildren(b.slug, "n-series", HONOR_N_MODELS),
                },
                {
                  label: "Honor X",
                  slug: "x-series",
                  children: makeFamilyChildren(b.slug, "x-series", HONOR_X_MODELS),
                },
                {
                  label: "Autres",
                  slug: "autres",
                  children: makeFamilyChildren(b.slug, "autres", HONOR_AUTRES_MODELS),
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
          : base.toLowerCase() === "one plus" || base.toLowerCase() === "oneplus"
            ? [
                {
                  label: "OnePlus",
                  slug: "oneplus-series",
                  children: makeFamilyChildren(b.slug, "oneplus-series", ONEPLUS_SERIES_MODELS),
                },
                {
                  label: "OnePlus Nord",
                  slug: "oneplus-nord-series",
                  children: makeFamilyChildren(b.slug, "oneplus-nord-series", ONEPLUS_NORD_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "motorola"
            ? [
                {
                  label: "Razr",
                  slug: "razr",
                  children: makeFamilyChildren(b.slug, "razr", MOTOROLA_RAZR_MODELS),
                },
                {
                  label: "Edge",
                  slug: "edge",
                  children: makeFamilyChildren(b.slug, "edge", MOTOROLA_EDGE_MODELS),
                },
                {
                  label: "Moto G",
                  slug: "moto-g",
                  children: makeFamilyChildren(b.slug, "moto-g", MOTOROLA_G_MODELS),
                },
                {
                  label: "Moto E",
                  slug: "moto-e",
                  children: makeFamilyChildren(b.slug, "moto-e", MOTOROLA_E_MODELS),
                },
                {
                  label: "ThinkPhone",
                  slug: "thinkphone",
                  children: makeFamilyChildren(b.slug, "thinkphone", MOTOROLA_THINKPHONE_MODELS),
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
          : base.toLowerCase() === "zte"
            ? [
                {
                  label: "ZTE series",
                  slug: "zte-series",
                  children: makeFamilyChildren(b.slug, "zte-series", ZTE_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "vivo"
            ? [
                {
                  label: "Vivo X",
                  slug: "x-series",
                  children: makeFamilyChildren(b.slug, "x-series", VIVO_X_SERIES_MODELS),
                },
                {
                  label: "Vivo Y",
                  slug: "y-series",
                  children: makeFamilyChildren(b.slug, "y-series", VIVO_Y_SERIES_MODELS),
                },
                {
                  label: "Vivo V",
                  slug: "v-series",
                  children: makeFamilyChildren(b.slug, "v-series", VIVO_V_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "tablets"
            ? [
                {
                  label: "I Pads",
                  slug: "ipads",
                  children: makeFamilyChildren(b.slug, "ipads", TABLET_IPADS_MODELS),
                },
                {
                  label: "TCL",
                  slug: "tcl-tablets",
                  children: makeFamilyChildren(b.slug, "tcl-tablets", TABLET_TCL_MODELS),
                },
                {
                  label: "Lenovo",
                  slug: "lenovo-tablets",
                  children: makeFamilyChildren(b.slug, "lenovo-tablets", TABLET_LENOVO_MODELS),
                },
                {
                  label: "Samsung Tablets",
                  slug: "samsung-tablets",
                  children: makeFamilyChildren(b.slug, "samsung-tablets", TABLET_SAMSUNG_MODELS),
                },
                {
                  label: "Xiaomi + Redmi",
                  slug: "xiaomi-redmi-tablets",
                  children: makeFamilyChildren(b.slug, "xiaomi-redmi-tablets", TABLET_XIAOMI_MODELS),
                },
                {
                  label: "Huawei",
                  slug: "huawei-tablets",
                  children: makeFamilyChildren(b.slug, "huawei-tablets", TABLET_HUAWEI_MODELS),
                },
              ]
          : base.toLowerCase() === "nokia"
            ? [
                {
                  label: "Nokia series",
                  slug: "nokia-series",
                  children: makeFamilyChildren(b.slug, "nokia-series", NOKIA_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "google pixel"
            ? [
                {
                  label: "Google Pixel series",
                  slug: "google-pixel-series",
                  children: makeFamilyChildren(b.slug, "google-pixel-series", GOOGLE_PIXEL_SERIES_MODELS),
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

  const findBrandIdx = (names: string[]) => {
    const keys = names.map((n) => n.toLowerCase());
    return brandGroups.findIndex((g) => {
      const label = displayBrandLabel(g.brand.label).toLowerCase();
      const slug = g.brand.slug.toLowerCase();
      return keys.some((k) => label.includes(k) || slug.includes(k));
    });
  };

  const openBrandMenu = (idx: number, opts?: { force?: boolean }) => {
    if (idx < 0) return;
    if (!opts?.force && menuOpen && activeBrandIdx === idx && openDropdown === "brands") {
      closeMenu();
      return;
    }
    setActiveBrandIdx(idx);
    setOpenDropdown("brands");
    setMenuOpen(true);
  };

  const openOthersMenu = (opts?: { force?: boolean }) => {
    if (!opts?.force && menuOpen && openDropdown === "others") {
      closeMenu();
      return;
    }
    setOpenDropdown("others");
    setMenuOpen(true);
  };

  const openCategoriesMenu = () => {
    if (menuOpen && openDropdown === "categories") {
      closeMenu();
      return;
    }
    setOpenDropdown("categories");
    setMenuOpen(true);
  };

  const primaryBrandIdx = {
    apple: findBrandIdx(["apple", "iphone"]),
    samsung: findBrandIdx(["samsung"]),
    xiaomi: findBrandIdx(["xiaomi"]),
    honor: findBrandIdx(["honor"]),
    motorola: findBrandIdx(["motorola"]),
    oneplus: findBrandIdx(["oneplus", "one plus"]),
    oppo: findBrandIdx(["oppo"]),
    realme: findBrandIdx(["realme"]),
    vivo: findBrandIdx(["vivo"]),
  };

  const othersActive = menuOpen && openDropdown === "others";
  const categoriesActive = menuOpen && openDropdown === "categories";

  const brandNavClass = (active: boolean) =>
    `inline-flex h-[46px] shrink-0 items-center whitespace-nowrap px-2.5 text-[14px] font-semibold transition-colors ${
      active ? "text-sam" : "text-white hover:text-sam"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ── Light utility bar (phones, tablets, and desktops) ── */}
      <div className="border-b border-black/[0.05] bg-[#F3F5F8] text-[12px] text-brand sm:text-[13px] dark:border-white/10 dark:bg-[#161E2E] dark:text-[#C5D0E8]">
        <div className={`${navShell} flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2 lg:h-9 lg:py-0`}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              {t("welcome")}
            </span>
            <span className="hidden h-3.5 w-px bg-brand/25 sm:block" aria-hidden />
            <a href="tel:+351937119295" className="inline-flex items-center gap-1.5 hover:text-brand-dark dark:hover:text-white">
              <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              {t("phone")}
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            {user ? (
              <Link href="/account" className="hover:text-brand-dark dark:hover:text-white" onClick={closeMenu}>
                {t("auth_my_account")}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Link href="/login" className="hover:text-brand-dark dark:hover:text-white" onClick={closeMenu}>
                  {t("login")}
                </Link>
                <span className="text-brand/40">|</span>
                <Link href="/register" className="hover:text-brand-dark dark:hover:text-white" onClick={closeMenu}>
                  {t("registration")}
                </Link>
              </span>
            )}
            <ThemeToggle />
            <div className="relative">
              <label className="inline-flex h-7 items-center gap-1.5 rounded-md border border-black/[0.08] bg-white px-2 text-[12px] font-medium text-brand dark:border-white/15 dark:bg-[#1B2436] dark:text-[#C5D0E8]">
                <Globe className="h-3.5 w-3.5" strokeWidth={1.8} />
                <select
                  className="max-w-[7.5rem] bg-transparent text-[12px] font-medium outline-none"
                  value={lang}
                  aria-label="Language"
                  onChange={(e) => setLang(e.target.value as (typeof LANG_OPTIONS)[number]["id"])}
                >
                  {LANG_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── White logo / search / actions ── */}
      <div className="border-b border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#12192A]">
        <div className={`${navShell} flex items-center gap-4 py-3 lg:py-3.5`}>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-brand-dark dark:text-white xl:hidden"
            aria-expanded={drawerOpen}
            aria-label={t("header_menu")}
            data-testid="button-nav-menu"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {drawerOpen ? <X className="h-7 w-7" strokeWidth={1.75} /> : <Menu className="h-7 w-7" strokeWidth={1.75} />}
          </button>

          <BrandLogo onClick={closeMenu} />

          <div className="hidden min-w-0 flex-1 lg:block">
            <div className="flex items-center overflow-hidden rounded-md border border-black/[0.12] bg-white dark:border-white/15 dark:bg-[#1B2436]">
              <SmartSearch variant="header" className="flex-1 rounded-none bg-transparent shadow-none" hideButton />
              <button
                type="button"
                className="flex h-11 w-12 shrink-0 items-center justify-center bg-brand-dark text-white transition-colors hover:bg-navy"
                aria-label={t("searchPlaceholder")}
              >
                <Search className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center lg:ml-0">
            <Link
              href="/compare"
              className="hidden items-center gap-2 px-4 text-brand-dark dark:text-white lg:flex"
              onClick={closeMenu}
              aria-label={t("compare")}
            >
              <span className="relative">
                <Repeat2 className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={compareKeys.length} />
              </span>
              <span className="text-[14px] font-semibold">{t("compare")}</span>
            </Link>
            <span className="hidden h-8 w-px bg-black/[0.08] dark:bg-white/15 lg:block" aria-hidden />
            <Link
              href="/wishlist"
              className="hidden items-center gap-2 px-4 text-brand-dark dark:text-white lg:flex"
              onClick={closeMenu}
              aria-label={t("wishlist")}
            >
              <span className="relative">
                <Heart className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={wishlistKeys.length} tone="danger" />
              </span>
              <span className="text-[14px] font-semibold">{t("wishlist")}</span>
            </Link>
            <span className="hidden h-8 w-px bg-black/[0.08] dark:bg-white/15 lg:block" aria-hidden />
            <button
              type="button"
              className="relative flex items-center gap-2 px-1 text-brand-dark dark:text-white lg:px-4"
              onClick={() => {
                closeMenu();
                openCart();
              }}
              aria-label={t("nav_cart")}
            >
              <span className="relative">
                <ShoppingBag className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={cartCount} tone="danger" showZero />
              </span>
            </button>
          </div>
        </div>

        <div className={`${navShell} pb-3 lg:hidden`}>
          <div className="overflow-hidden rounded-md border border-black/[0.12] dark:border-white/15">
            <SmartSearch variant="header" />
          </div>
        </div>
      </div>

      {/* Full brand row only on wide desktops — mobile uses the hamburger */}
      <nav className="hidden bg-brand-dark xl:block">
        <div className={`${navShell} flex h-[46px] items-center justify-center gap-1.5`}>
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3.5 text-[13px] font-bold text-white transition-colors ${
              categoriesActive ? "bg-[#E89A1C]" : "bg-sam hover:bg-[#E89A1C]"
            }`}
            aria-expanded={categoriesActive}
            onClick={openCategoriesMenu}
          >
            <Menu className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            All Accessories
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${categoriesActive ? "rotate-180" : ""}`} aria-hidden />
          </button>
          <div className="flex min-w-0 items-center">
          {(
            [
              { label: "Apple", slug: "apple", idx: primaryBrandIdx.apple },
              { label: "Samsung", slug: "samsung", idx: primaryBrandIdx.samsung },
              { label: "Xiaomi", slug: "xiaomi", idx: primaryBrandIdx.xiaomi },
              { label: "Honor", slug: "honor", idx: primaryBrandIdx.honor },
              { label: "Motorola", slug: "motorola", idx: primaryBrandIdx.motorola },
              { label: "OnePlus", slug: "oneplus", idx: primaryBrandIdx.oneplus },
              { label: "Oppo", slug: "oppo", idx: primaryBrandIdx.oppo },
              { label: "Realme", slug: "realme", idx: primaryBrandIdx.realme },
              { label: "Vivo", slug: "vivo", idx: primaryBrandIdx.vivo },
            ] as const
          ).map((item) => {
            const active = menuOpen && openDropdown === "brands" && activeBrandIdx === item.idx;
            return (
              <button
                key={item.label}
                type="button"
                title="Click to open menu · Double-click to view all products"
                className={brandNavClass(active)}
                aria-expanded={active}
                onClick={() => openBrandMenu(item.idx)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  closeMenu();
                  navigate(`/brand/${item.slug}`);
                }}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            className={brandNavClass(othersActive)}
            aria-expanded={othersActive}
            onClick={() => openOthersMenu()}
          >
            {t("nav_bar_others")}
          </button>
          <Link
            href="/phones"
            className={brandNavClass(location.startsWith("/phones") || location.startsWith("/smartphones"))}
            onClick={closeMenu}
          >
            Smartphones
          </Link>
          <Link
            href="/cards"
            className={brandNavClass(location.startsWith("/cards"))}
            onClick={closeMenu}
          >
            Cards
          </Link>
          <Link
            href="/book-repair"
            className={brandNavClass(
              location.startsWith("/book-repair") || location.startsWith("/diagnostics") || location.startsWith("/trade-in"),
            )}
            onClick={closeMenu}
          >
            Tools
          </Link>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
              className="absolute left-0 right-0 top-full z-40 hidden h-screen bg-transparent xl:block"
          onClick={closeMenu}
        />
      ) : null}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full z-50 hidden max-h-[min(82vh,780px)] overflow-y-auto border-b border-black/[0.06] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#12192A] xl:block"
          >
            {openDropdown === "categories" ? (
              <AllCategoriesMegaPanel onClose={closeMenu} />
            ) : openDropdown === "others" ? (
              <OthersMegaPanel onClose={closeMenu} />
            ) : (
              <BrandMegaPanel brand={activeBrand} onClose={closeMenu} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cartCount={cartCount}
        wishlistCount={wishlistKeys.length}
        compareCount={compareKeys.length}
        onOpenCart={openCart}
        theme={theme}
        onToggleTheme={toggleTheme}
        brandGroups={brandGroups}
      />
    </header>
  );
}
