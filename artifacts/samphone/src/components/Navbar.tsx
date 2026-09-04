import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Heart, Phone, ChevronDown, Search, Gift, Globe, Repeat2, ShoppingBag } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import { motion, AnimatePresence } from "framer-motion";
import AccessoryPageButtons from "@/components/AccessoryPageButtons";
import { smartphonesColumns } from "@/data/categories";
import {
  APPLE_IPHONE_MODELS,
  APPLE_WATCH_MODELS,
  APPLE_IPAD_MODELS,
} from "@/data/nav-apple";
import { NAV_OTHER_BRANDS } from "@/data/nav-others";
import {
  SAMSUNG_A_SERIES_MODELS,
  SAMSUNG_S_SERIES_MODELS,
  SAMSUNG_Z_SERIES_MODELS,
  SAMSUNG_M_SERIES_MODELS,
  SAMSUNG_J_SERIES_MODELS,
  SAMSUNG_NOTE_SERIES_MODELS,
  XIAOMI_REDMI_SERIES_MODELS,
  XIAOMI_POCO_SERIES_MODELS,
  XIAOMI_REDMI_NOTE_SERIES_MODELS,
  XIAOMI_MI_SERIES_MODELS,
  OPPO_RENO_SERIES_MODELS,
  OPPO_A_SERIES_MODELS,
  OPPO_F_SERIES_MODELS,
  OPPO_FIND_X_SERIES_MODELS,
  REALME_C_SERIES_MODELS,
  REALME_NUMBER_SERIES_MODELS,
  REALME_NARZO_SERIES_MODELS,
  HUAWEI_P_SERIES_MODELS,
  HUAWEI_Y_SERIES_MODELS,
  HUAWEI_HONOR_SERIES_MODELS,
  HUAWEI_MATE_SERIES_MODELS,
  HUAWEI_NOVA_SERIES_MODELS,
  ONEPLUS_SERIES_MODELS,
  ONEPLUS_NORD_SERIES_MODELS,
  MOTOROLA_G_SERIES_MODELS,
  MOTOROLA_EDGE_SERIES_MODELS,
  MOTOROLA_E_SERIES_MODELS,
  MOTOROLA_ONE_SERIES_MODELS,
  ALCATEL_SERIES_MODELS,
  TCL_SERIES_MODELS,
  ZTE_SERIES_MODELS,
  VIVO_SERIES_MODELS,
  NOKIA_SERIES_MODELS,
  GOOGLE_PIXEL_SERIES_MODELS,
  TABLET_IPADS_MODELS,
  TABLET_TCL_MODELS,
  TABLET_LENOVO_MODELS,
  TABLET_SAMSUNG_MODELS,
  TABLET_XIAOMI_MODELS,
  TABLET_HUAWEI_MODELS,
  LG_SERIES_MODELS,
} from "@/data/nav-brand-models";
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
      className={`absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-0.5 typo-cart-count ${
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
    .replace(/[()]/g, " ")
    .replace(/[/+,]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
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

const HONOR_PAD_MODELS = TABLET_HUAWEI_MODELS.filter((label) => /honor/i.test(label));

type NavFamily = NavBrandGroup["items"][number];

function isAppleBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "iphone-parts" || label === "iphone" || label === "apple";
}

function isSamsungBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "samsung-parts" || label === "samsung";
}

function isXiaomiBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "xiaomi-parts" || label === "xiaomi";
}

function isHuaweiBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "huawei-parts" || label === "huawei";
}

function isMotorolaBrand(brand: NavBrandGroup) {
  const slug = brand.brand.slug.toLowerCase();
  const label = brand.brand.label.toLowerCase();
  return slug === "motorola-parts" || slug.includes("motorola") || label === "motorola";
}

function packMegaRows(brand: NavBrandGroup, families: NavFamily[]): NavFamily[][][] {
  const bySlug = new Map(families.map((family) => [family.slug, family]));
  const pick = (...slugs: string[]) =>
    slugs.map((slug) => bySlug.get(slug)).filter((family): family is NavFamily => Boolean(family));

  if (isAppleBrand(brand)) {
    const row = [
      pick("iphones"),
      pick("ipad"),
      pick("iwatch"),
    ].filter((col) => col.length > 0);
    return row.length ? [row] : [families.map((family) => [family])];
  }

  if (isSamsungBrand(brand)) {
    const row = [
      pick("a-series"),
      pick("s-series", "j-series"),
      pick("z-series", "m-series"),
      pick("samsung-tablets", "note-series"),
    ].filter((col) => col.length > 0);
    return row.length ? [row] : [families.map((family) => [family])];
  }

  if (isXiaomiBrand(brand)) {
    const row = [
      pick("redmi-series"),
      pick("redmi-note-series"),
      pick("mi-series"),
      pick("xiaomi-redmi-tablets", "poco-series"),
    ].filter((col) => col.length > 0);
    return row.length ? [row] : [families.map((family) => [family])];
  }

  if (isHuaweiBrand(brand)) {
    const row = [
      pick("p-series"),
      pick("y-series", "mate-series"),
      pick("honor-series"),
      pick("nova-series"),
      pick("huawei-tablets"),
    ].filter((col) => col.length > 0);
    return row.length ? [row] : [families.map((family) => [family])];
  }

  if (isMotorolaBrand(brand)) {
    const row = [
      pick("g-series"),
      pick("edge-series"),
      pick("e-series"),
      pick("one-series"),
    ].filter((col) => col.length > 0);
    return row.length ? [row] : [families.map((family) => [family])];
  }

  return [families.map((family) => [family])];
}

function megaRowGridClass(row: NavFamily[][], apple: boolean, fourCol: boolean) {
  if (fourCol) {
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }
  if (apple) {
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }
  return row.length >= 5
    ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

const megaLinkClass =
  "block text-[13px] leading-5 text-[#333333] hover:text-brand dark:text-white";
const megaHeadingClass =
  "mb-3 text-[16px] font-bold uppercase leading-6 text-[#111111] dark:text-white";

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
  const rows = packMegaRows(brand, families);
  const apple = isAppleBrand(brand);
  const fourCol = isSamsungBrand(brand) || isXiaomiBrand(brand) || isMotorolaBrand(brand);

  return (
    <div className={`${navShell} dropdown-type bg-white py-6 dark:bg-[#12192A]`}>
      {families.length > 0 ? (
        <div className="flex flex-col gap-8">
          {rows.map((row, rowIdx) => (
            <div key={`${brand.brand.slug}-row-${rowIdx}`} className={megaRowGridClass(row, apple, fourCol)}>
              {row.map((column, colIdx) => (
                <div
                  key={`${brand.brand.slug}-r${rowIdx}-c${colIdx}-${column.map((f) => f.slug).join("-")}`}
                  className={`min-w-0 px-5 py-2 ${
                    colIdx < row.length - 1 ? "sm:border-r sm:border-black/15 dark:sm:border-white/15" : ""
                  }`}
                >
                  {column.map((family) => {
                    const models = family.children ?? [];
                    return (
                      <div key={`${brand.brand.slug}-${family.slug}`} className="mb-6 last:mb-0">
                        <p className={megaHeadingClass}>{family.label.toUpperCase()}</p>
                        <ul className="space-y-1.5">
                          {models.map((model, midx) => (
                            <li key={`${family.slug}-${midx}-${model.slug}`}>
                              <Link
                                href={
                                  model.href ??
                                  `/model/${brandRoute}/${family.slug}/${model.slug}`
                                }
                                onClick={onClose}
                                className={megaLinkClass}
                              >
                                {model.label}
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
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
          {looseItems.map((item) => (
            <Link
              key={item.slug}
              href={item.href ?? `/category/${item.slug}`}
              onClick={onClose}
              className={megaLinkClass}
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
    <div className={`${navShell} dropdown-type bg-white py-4 dark:bg-[#12192A]`}>
      <div className="grid grid-cols-2 bg-white sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 dark:bg-[#12192A]">
        {NAV_OTHER_BRANDS.map((brand, idx) => (
          <div
            key={brand.slug}
            className={`px-5 py-3 ${idx % 5 !== 4 ? "xl:border-r xl:border-black/15" : ""}`}
          >
            <p className={megaHeadingClass}>{brand.name.toUpperCase()}</p>
            <ul className="space-y-1.5">
              {brand.models.map((model) => {
                const slug = slugifyModelLabel(model.label);
                return (
                  <li key={`${brand.slug}-${slug}`}>
                    <Link
                                href={model.href ?? `/model/${brand.slug}/models/${slug}`}
                                onClick={onClose}
                                className={megaLinkClass}
                              >
                      {model.label}
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

function AllAccessoriesMegaPanel({ onClose }: { onClose: () => void }) {
  return <AccessoryPageButtons variant="mega" onNavigate={onClose} />;
}

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { totalItems: cartCount } = useCart();
  const { user } = useAuth();
  const { keys: compareKeys } = useCompare();
  const { keys: wishlistKeys } = useWishlist();
  const { categories: wooCategories } = useProductCatalog();
  const [activeBrandIdx, setActiveBrandIdx] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const closeMenu = () => {
    setOpenDropdown(null);
    setMenuOpen(false);
    setDrawerOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
    setOpenDropdown(null);
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
                label: "I PHONE",
                slug: "iphones",
                children: makeFamilyChildren(b.slug, "iphones", APPLE_IPHONE_MODELS),
              },
              {
                label: "I PAD",
                slug: "ipad",
                children: makeFamilyChildren(b.slug, "ipad", APPLE_IPAD_MODELS),
              },
              {
                label: "APPLE WATCH",
                slug: "iwatch",
                children: makeFamilyChildren(b.slug, "iwatch", APPLE_WATCH_MODELS),
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
                  label: "Samsung Tablets",
                  slug: "samsung-tablets",
                  children: makeFamilyChildren(b.slug, "samsung-tablets", TABLET_SAMSUNG_MODELS),
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
                {
                  label: "Xiaomi+Redmi Tablets",
                  slug: "xiaomi-redmi-tablets",
                  children: makeFamilyChildren(b.slug, "xiaomi-redmi-tablets", TABLET_XIAOMI_MODELS),
                },
                {
                  label: "Poco series",
                  slug: "poco-series",
                  children: makeFamilyChildren(b.slug, "poco-series", XIAOMI_POCO_SERIES_MODELS),
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
                {
                  label: "Honor Pad",
                  slug: "honor-pad",
                  children: makeFamilyChildren(b.slug, "honor-pad", HONOR_PAD_MODELS),
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
                {
                  label: "Huawei Tablets",
                  slug: "huawei-tablets",
                  children: makeFamilyChildren(b.slug, "huawei-tablets", TABLET_HUAWEI_MODELS),
                },
              ]
          : base.toLowerCase() === "one plus" || base.toLowerCase() === "oneplus"
            ? [
                {
                  label: "One Plus series",
                  slug: "oneplus-series",
                  children: makeFamilyChildren(b.slug, "oneplus-series", ONEPLUS_SERIES_MODELS),
                },
                {
                  label: "One Plus Nord series",
                  slug: "oneplus-nord-series",
                  children: makeFamilyChildren(b.slug, "oneplus-nord-series", ONEPLUS_NORD_SERIES_MODELS),
                },
              ]
          : base.toLowerCase() === "motorola"
            ? [
                {
                  label: "G series",
                  slug: "g-series",
                  children: makeFamilyChildren(b.slug, "g-series", MOTOROLA_G_SERIES_MODELS),
                },
                {
                  label: "Edge series",
                  slug: "edge-series",
                  children: makeFamilyChildren(b.slug, "edge-series", MOTOROLA_EDGE_SERIES_MODELS),
                },
                {
                  label: "E series",
                  slug: "e-series",
                  children: makeFamilyChildren(b.slug, "e-series", MOTOROLA_E_SERIES_MODELS),
                },
                {
                  label: "One series",
                  slug: "one-series",
                  children: makeFamilyChildren(b.slug, "one-series", MOTOROLA_ONE_SERIES_MODELS),
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
                  label: "Vivo",
                  slug: "vivo-series",
                  children: makeFamilyChildren(b.slug, "vivo-series", VIVO_SERIES_MODELS),
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
                  label: "Xiaomi+Redmi Tablets",
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
          : base.toLowerCase() === "lg"
            ? [
                {
                  label: "LG",
                  slug: "lg-series",
                  children: makeFamilyChildren(b.slug, "lg-series", LG_SERIES_MODELS),
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
    oppoReno: findBrandIdx(["oppo reno", "oppo-reno"]),
    realme: findBrandIdx(["realme"]),
    huawei: findBrandIdx(["huawei"]),
    oneplus: findBrandIdx(["oneplus", "one plus"]),
    motorola: findBrandIdx(["motorola"]),
  };

  const othersActive =
    (menuOpen && openDropdown === "others") ||
    location.startsWith("/multi-brand");
  const categoriesActive = menuOpen && openDropdown === "categories";

  const brandRouteActive = (slug: string) => {
    const path = location.toLowerCase();
    const s = slug.toLowerCase();
    if (path.startsWith(`/brand/${s}`)) return true;
    if (s === "apple") {
      return path.startsWith("/model/iphone") || path.startsWith("/model/apple") || path.startsWith("/brand/iphone");
    }
    if (s === "oppo-reno") {
      return path.startsWith("/brand/oppo") || path.startsWith("/model/oppo");
    }
    if (s === "oneplus") {
      return path.startsWith("/brand/oneplus") || path.startsWith("/model/oneplus") || path.startsWith("/brand/one-plus");
    }
    return path.startsWith(`/model/${s}`);
  };

  const navItemClass = (active: boolean) =>
    `nav-bar-item inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-sm px-2.5 uppercase text-white no-underline transition-[background-color] ${
      active ? "bg-sam" : "bg-transparent hover:bg-sam/90"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ── Light utility bar (phones, tablets, and desktops) ── */}
      <div className="border-b border-black/[0.05] bg-[#F5F5F5] typo-topbar text-[#4A4A4A] dark:border-white/10 dark:bg-[#12192A] dark:text-[#C5D0E8]">
        <div className={`${navShell} flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2 lg:h-9 lg:py-0`}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              {t("welcome")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <a href="tel:+351937119295" className="typo-phone inline-flex items-center gap-1.5 text-[#333333] hover:text-brand dark:hover:text-white">
              <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              {t("phone")}
            </a>
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
              <label className="inline-flex h-7 items-center gap-1.5 rounded-md border border-black/[0.08] bg-white px-2 typo-topbar text-[#555555] dark:border-white/15 dark:bg-[#1B2436] dark:text-[#C5D0E8]">
                <Globe className="h-3.5 w-3.5" strokeWidth={1.8} />
                <select
                  className="max-w-[7.5rem] bg-transparent typo-topbar outline-none"
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

          <BrandLogo className="h-8 w-auto sm:h-9" onClick={closeMenu} />

          <div className="hidden min-w-0 flex-1 lg:block">
            <div className="flex items-center overflow-hidden rounded-md border border-black/[0.08] bg-[#F3F4F6] dark:border-white/15 dark:bg-[#1B2436]">
              <SmartSearch variant="header" className="flex-1 rounded-none bg-transparent shadow-none" hideButton />
              <button
                type="button"
                className="flex h-11 w-12 shrink-0 items-center justify-center bg-brand text-white transition-colors hover:bg-brand-dark"
                aria-label={t("searchPlaceholder")}
              >
                <Search className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center lg:ml-0">
            <Link
              href="/compare"
              className="hidden items-center gap-2.5 px-4 lg:flex"
              onClick={closeMenu}
              aria-label={t("compare")}
            >
              <span className="relative text-[#333333] dark:text-white">
                <Repeat2 className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={compareKeys.length} />
              </span>
              <span className="typo-header-action dark:text-white">{t("compare")}</span>
            </Link>
            <span className="hidden h-8 w-px bg-black/[0.08] dark:bg-white/15 lg:block" aria-hidden />
            <Link
              href="/wishlist"
              className="hidden items-center gap-2.5 px-4 lg:flex"
              onClick={closeMenu}
              aria-label={t("wishlist")}
            >
              <span className="relative text-[#333333] dark:text-white">
                <Heart className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={wishlistKeys.length} tone="danger" />
              </span>
              <span className="typo-header-action dark:text-white">{t("wishlist")}</span>
            </Link>
            <span className="hidden h-8 w-px bg-black/[0.08] dark:bg-white/15 lg:block" aria-hidden />
            <Link
              href="/cart"
              className="flex items-center gap-2.5 px-4"
              onClick={closeMenu}
              aria-label={t("nav_cart")}
            >
              <span className="relative text-sam">
                <ShoppingBag className="h-6 w-6" strokeWidth={1.7} />
                <CountBadge count={cartCount} tone="danger" showZero />
              </span>
              <span className="typo-header-action dark:text-white">{t("nav_cart")}</span>
            </Link>
          </div>
        </div>

        <div className={`${navShell} pb-3 lg:hidden`}>
          <div className="overflow-hidden rounded-md border border-black/[0.12] dark:border-white/15">
            <SmartSearch variant="header" />
          </div>
        </div>
      </div>

      {/* Brand row only on wide desktops — mobile uses the hamburger */}
      <nav className="relative z-[55] hidden w-full overflow-visible bg-brand xl:block">
        <div className="mx-auto flex h-[50px] w-full max-w-[1600px] items-center justify-start px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <div className="relative shrink-0 self-stretch">
            <button
              type="button"
              className={`nav-all-categories inline-flex h-full shrink-0 items-center gap-2 px-3 text-white transition-[background-color] ${
                categoriesActive
                  ? "bg-sam-dark"
                  : "bg-sam hover:bg-sam-dark"
              }`}
              aria-expanded={categoriesActive}
              onClick={openCategoriesMenu}
            >
              <Menu className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              <span>{t("nav_all_accessories")}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${categoriesActive ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <AnimatePresence>
              {categoriesActive ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.14 }}
                  className="absolute left-0 top-full z-[60] overflow-hidden rounded-b-2xl rounded-tr-2xl border border-black/[0.06] bg-white shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
                >
                  <AllAccessoriesMegaPanel onClose={closeMenu} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="ml-5 flex min-w-0 flex-1 items-center overflow-x-auto hide-dropdown-scrollbar sm:ml-6 md:ml-8">
            <div className="flex min-w-0 items-center gap-x-1">
              <Link href="/" className={navItemClass(location === "/" || location === "")} onClick={closeMenu}>
                {t("nav_home")}
              </Link>
              <Link
                href="/new"
                className={navItemClass(location.startsWith("/new"))}
                onClick={closeMenu}
              >
                {t("nav_new")}
              </Link>
              {(
                [
                  { label: "Apple", slug: "apple", idx: primaryBrandIdx.apple },
                  { label: "Samsung", slug: "samsung", idx: primaryBrandIdx.samsung },
                  { label: "Xiaomi", slug: "xiaomi", idx: primaryBrandIdx.xiaomi },
                  { label: "Oppo Reno", slug: "oppo-reno", idx: primaryBrandIdx.oppoReno },
                  { label: "Realme", slug: "realme", idx: primaryBrandIdx.realme },
                  { label: "Huawei", slug: "huawei", idx: primaryBrandIdx.huawei },
                  { label: "One Plus", slug: "oneplus", idx: primaryBrandIdx.oneplus },
                  { label: "Motorola", slug: "motorola", idx: primaryBrandIdx.motorola },
                ] as const
              ).map((item) => {
                const active =
                  (menuOpen && openDropdown === "brands" && activeBrandIdx === item.idx) ||
                  brandRouteActive(item.slug);
                return (
                  <button
                    key={item.label}
                    type="button"
                    title="Click to open menu · Double-click to view all products"
                    className={navItemClass(active)}
                    aria-expanded={menuOpen && openDropdown === "brands" && activeBrandIdx === item.idx}
                    aria-current={brandRouteActive(item.slug) ? "page" : undefined}
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
                className={navItemClass(othersActive)}
                aria-expanded={othersActive}
                onClick={() => openOthersMenu()}
              >
                {t("nav_bar_others")}
              </button>
              <Link
                href="/phones"
                className={navItemClass(location.startsWith("/phones") || location.startsWith("/smartphones"))}
                onClick={closeMenu}
              >
                Smartphones
              </Link>
              <Link
                href="/tablets"
                className={navItemClass(location.startsWith("/tablets"))}
                onClick={closeMenu}
              >
                Tablets
              </Link>
              <Link
                href="/cards"
                className={navItemClass(location.startsWith("/cards") || location.startsWith("/group/Cards"))}
                onClick={closeMenu}
              >
                Cards
              </Link>
              <Link
                href="/tools"
                className={navItemClass(
                  location.startsWith("/tools") || location.startsWith("/group/Repairing"),
                )}
                onClick={closeMenu}
              >
                Tools
              </Link>
            </div>
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
        {menuOpen && openDropdown !== "categories" ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full z-50 hidden overflow-hidden border-b border-black/[0.06] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#12192A] xl:block"
          >
            <div
              className="max-h-[calc(100dvh-var(--site-header-h,9rem))] overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {openDropdown === "others" ? (
                <OthersMegaPanel onClose={closeMenu} />
              ) : (
                <BrandMegaPanel brand={activeBrand} onClose={closeMenu} />
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cartCount={cartCount}
        wishlistCount={wishlistKeys.length}
        compareCount={compareKeys.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        brandGroups={brandGroups}
      />
    </header>
  );
}
