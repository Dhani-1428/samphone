import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
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

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

type DeviceSection = "phones" | "tablets";

function SmartphonesHeader({ section }: { section: DeviceSection }) {
  const { t } = useLang();
  return (
    <PageVideoHero
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
    <div>
      <section>
        <SmartphonesHeader section={section} />
        <div className="border-t border-black/[0.06]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:px-8 md:px-10 lg:px-14">
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => setSection("phones")}
                className={cn(
                  "border-b-2 pb-1 text-sm font-semibold transition-colors",
                  section === "phones"
                    ? "border-[#5A73A8] text-navy"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                {t("smartphones_tab_phones")}
              </button>
              <button
                type="button"
                onClick={() => setSection("tablets")}
                className={cn(
                  "border-b-2 pb-1 text-sm font-semibold transition-colors",
                  section === "tablets"
                    ? "border-[#5A73A8] text-navy"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                {t("smartphones_tab_tablets")}
              </button>
            </div>
            <Link
              href="/category/tablets"
              className="text-sm font-medium text-[#5A73A8] hover:underline sm:ml-auto"
            >
              {t("smartphones_category_tablets_link")}
            </Link>
          </div>
        </div>
      </section>

      <div className="py-8">
        <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A73A8]/30"
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
          {/* Brand cards removed as requested. */}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h2 className="mb-6 font-display text-2xl font-bold text-navy">{productsHeading}</h2>

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

        {!woo && (
          <p className="py-16 text-sm text-muted-foreground">{t("smartphones_tablets_catalog_hint")}</p>
        )}
      </div>
    </div>
  );
}
