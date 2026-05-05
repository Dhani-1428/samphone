import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import smartphoneAppleVideo from "@/assets/smartphone-apple.mp4";
import { PHONE_PARTS } from "@/data/catalog";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { searchProductsQuery, type WooProduct } from "@/lib/woocommerce";
import {
  filterCatalogForSmartphonesTab,
  filterProductsByBrandKeyword,
  filterSmartphoneBrand,
  filterTabletBrand,
} from "@/lib/woo-product-filters";
import { cn } from "@/lib/utils";

const brands = [
  { name: "iPhone", img: productScreen, count: "180+", color: "from-gray-700 to-gray-900" },
  { name: "Samsung", img: productCase, count: "220+", color: "from-blue-700 to-blue-900" },
  { name: "Xiaomi", img: productCharger, count: "140+", color: "from-orange-600 to-red-700" },
  { name: "OPPO", img: productScreen, count: "90+", color: "from-green-700 to-emerald-900" },
  { name: "Realme", img: productCase, count: "80+", color: "from-yellow-600 to-orange-700" },
  { name: "Huawei", img: productCharger, count: "110+", color: "from-red-700 to-rose-900" },
  { name: "One Plus", img: productScreen, count: "70+", color: "from-red-600 to-red-900" },
  { name: "Motorola", img: productCase, count: "60+", color: "from-indigo-700 to-indigo-900" },
  { name: "Alcatel", img: productCharger, count: "40+", color: "from-teal-700 to-teal-900" },
  { name: "Google Pixel", img: productScreen, count: "55+", color: "from-blue-600 to-cyan-700" },
  { name: "Nokia", img: productCase, count: "45+", color: "from-sky-700 to-sky-900" },
];

const tabletBrands = [
  { name: "MODIO", img: productCharger, count: "Tablets", color: "from-violet-700 to-violet-900" },
  { name: "iPad", img: productScreen, count: "Apple", color: "from-gray-700 to-gray-900" },
  { name: "Galaxy Tab", img: productCase, count: "Samsung", color: "from-blue-700 to-blue-900" },
  { name: "Xiaomi Pad", img: productCharger, count: "Xiaomi", color: "from-orange-600 to-red-700" },
  { name: "Huawei MatePad", img: productScreen, count: "Huawei", color: "from-red-700 to-rose-900" },
  { name: "Lenovo Tab", img: productCase, count: "Lenovo", color: "from-indigo-700 to-indigo-900" },
  { name: "Android tablet", img: productCharger, count: "More", color: "from-slate-600 to-slate-800" },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

type DeviceSection = "phones" | "tablets";

function SmartphonesHeader({ section }: { section: DeviceSection }) {
  const { t } = useLang();
  return (
    <PageVideoHero
      videoSrc={smartphoneAppleVideo}
      eyebrow={t("smartphones_breadcrumb")}
      title={section === "phones" ? t("smartphones_hero_phones_title") : t("smartphones_hero_tablets_title")}
      description={t("smartphones_hero_sub")}
    />
  );
}

const SEARCH_DEBOUNCE_MS = 400;
function sectionFromPath(path: string): DeviceSection {
  const p = path.toLowerCase();
  if (p.startsWith("/tablets")) return "tablets";
  return "phones";
}

export default function Smartphones() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error, syncingMore } = useProductCatalog();
  const [location] = useLocation();
  const routeSection = sectionFromPath(location);
  const [section, setSection] = useState<DeviceSection>(routeSection);
  const [selected, setSelected] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [apiRawHits, setApiRawHits] = useState<WooProduct[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [section]);

  useEffect(() => {
    setSection(routeSection);
  }, [routeSection]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setApiRawHits(null);
    setSearchError(null);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (!woo || !debouncedSearch) {
      setApiRawHits(null);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setApiRawHits(null);
    setSearchLoading(true);
    setSearchError(null);

    void searchProductsQuery(debouncedSearch)
      .then((hits) => {
        if (cancelled) return;
        setApiRawHits(filterCatalogForSmartphonesTab(hits, section));
      })
      .catch((e) => {
        if (cancelled) return;
        setApiRawHits([]);
        setSearchError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [woo, debouncedSearch, section]);

  const brandTiles = section === "phones" ? brands : tabletBrands;

  const catalogList = useMemo(
    () =>
      woo
        ? section === "phones"
          ? filterSmartphoneBrand(products, selected)
          : filterTabletBrand(products, selected)
        : [],
    [woo, products, selected, section],
  );

  const searchResultList = useMemo(() => {
    if (!woo || !debouncedSearch || apiRawHits === null) return [];
    return filterProductsByBrandKeyword(apiRawHits, selected);
  }, [woo, debouncedSearch, apiRawHits, selected]);

  const displayList = debouncedSearch ? searchResultList : catalogList;

  const showCatalogSpinner = woo && loading && !debouncedSearch && catalogList.length === 0;
  const showSearchSpinner = woo && Boolean(debouncedSearch) && searchLoading;
  const showSyncBanner = woo && syncingMore && catalogList.length > 0 && !debouncedSearch;

  const productsHeading = debouncedSearch
    ? t("smartphones_search_results", { query: debouncedSearch })
    : selected
      ? t("smartphones_parts_heading_selected", { brand: selected })
      : t("smartphones_parts_heading_default");

  return (
    <div className="bg-background">
      <section className="border-b border-border">
        <SmartphonesHeader section={section} />
        <div className="border-t border-border bg-muted/40">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSection("phones")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  section === "phones"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-foreground ring-1 ring-border hover:bg-muted",
                )}
              >
                {t("smartphones_tab_phones")}
              </button>
              <button
                type="button"
                onClick={() => setSection("tablets")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  section === "tablets"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-foreground ring-1 ring-border hover:bg-muted",
                )}
              >
                {t("smartphones_tab_tablets")}
              </button>
            </div>
            <Link
              href="/category/tablets"
              className="text-sm font-medium text-primary hover:underline sm:ml-auto"
            >
              {t("smartphones_category_tablets_link")}
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-muted/30 py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-xl font-bold text-foreground">
              {section === "phones" ? t("smartphones_select_brand") : t("smartphones_select_tablet_brand")}
            </h2>
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("smartphones_search_brand")}
                autoComplete="off"
                enterKeyHint="search"
                aria-label={t("smartphones_search_brand")}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("smartphones_search_clear")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6"
          >
            {brandTiles.map((b) => (
              <motion.button
                key={`${section}-${b.name}`}
                type="button"
                variants={itemVariants}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(selected === b.name ? null : b.name)}
                className={`overflow-hidden rounded-2xl border-2 transition-all ${selected === b.name ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"}`}
              >
                <div
                  className={`relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br ${b.color}`}
                >
                  <img src={b.img} alt={b.name} className="h-full w-full object-cover opacity-30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <span className="text-center font-display text-xs font-bold leading-tight text-white md:text-sm">
                      {b.name}
                    </span>
                    <span className="mt-1 text-xs text-white/70">{b.count}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold text-foreground">{productsHeading}</h2>

        {showSyncBanner && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            {t("woo_syncing_more")}
          </p>
        )}

        {searchError && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {searchError}
          </p>
        )}

        {showSearchSpinner && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("smartphones_search_loading")}</p>
          </div>
        )}

        {showCatalogSpinner && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {woo && !loading && error && <p className="py-8 text-sm text-destructive">{error}</p>}

        {woo &&
          !showCatalogSpinner &&
          !showSearchSpinner &&
          !loading &&
          !error &&
          !searchError &&
          displayList.length === 0 && <p className="py-16 text-sm text-muted-foreground">{t("woo_empty")}</p>}

        {woo && !showSearchSpinner && !showCatalogSpinner && displayList.length > 0 && (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6"
          >
            {displayList.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && section === "phones" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
          >
            {PHONE_PARTS.map((p) => (
              <motion.div key={p.cartKey} variants={itemVariants}>
                <ProductCard {...p} testPrefix="phone" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!woo && section === "tablets" && (
          <p className="py-16 text-sm text-muted-foreground">{t("smartphones_tablets_catalog_hint")}</p>
        )}
      </div>
    </div>
  );
}
