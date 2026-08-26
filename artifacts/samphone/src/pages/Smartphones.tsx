import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useLang } from "@/contexts/LanguageContext";
import { SMARTPHONE_FETCH_QUERIES, TABLET_FETCH_QUERIES } from "@/data/device-catalog";
import { searchProductsQuery, type WooProduct } from "@/lib/woocommerce";
import { fetchCloudMergedProducts } from "@/lib/samphone-cloud";
import {
  filterCatalogForSmartphonesTab,
  sortByPrice,
} from "@/lib/woo-product-filters";
import { cn } from "@/lib/utils";

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

function sectionQueries(section: DeviceSection): Record<string, string>[] {
  return section === "tablets" ? TABLET_FETCH_QUERIES : SMARTPHONE_FETCH_QUERIES;
}

export default function Smartphones() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const [location, navigate] = useLocation();
  const routeSection = sectionFromPath(location);
  const [section, setSection] = useState<DeviceSection>(routeSection);

  const [items, setItems] = useState<WooProduct[] | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [apiRawHits, setApiRawHits] = useState<WooProduct[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setSection(routeSection);
  }, [routeSection]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!woo) {
      setItems([]);
      setLoadingMore(false);
      return;
    }
    let alive = true;
    setItems(null);
    setCatalogTotal(0);
    setLoadingMore(true);
    void fetchCloudMergedProducts(sectionQueries(section), (list) => {
      if (!alive) return;
      const filtered = filterCatalogForSmartphonesTab(list, section);
      setCatalogTotal(filtered.length);
      setItems([...filtered]);
    })
      .then((list) => {
        if (!alive) return;
        const filtered = filterCatalogForSmartphonesTab(list, section);
        setItems(filtered);
        setCatalogTotal(filtered.length);
        setLoadingMore(false);
      })
      .catch(() => {
        if (!alive) return;
        setItems((prev) => prev ?? []);
        setLoadingMore(false);
      });
    return () => {
      alive = false;
    };
  }, [woo, section]);

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

  const catalogList = useMemo(() => sortByPrice(items ?? [], "asc"), [items]);

  const searchResultList = useMemo(() => {
    if (!woo || !debouncedSearch || apiRawHits === null) return [];
    return sortByPrice(apiRawHits, "asc");
  }, [woo, debouncedSearch, apiRawHits]);

  const displayList = debouncedSearch ? searchResultList : catalogList;
  const loading = items == null;
  const showCatalogSpinner = woo && loading && !debouncedSearch;
  const showSearchSpinner = woo && Boolean(debouncedSearch) && searchLoading;
  const showSyncBanner = woo && loadingMore && catalogList.length > 0 && !debouncedSearch;

  const countLabel =
    !debouncedSearch && loadingMore && catalogTotal > catalogList.length
      ? t("accessory_product_count_of", { count: catalogList.length, total: catalogTotal })
      : t("accessory_product_count", { count: displayList.length });

  const productsHeading = debouncedSearch
    ? t("smartphones_search_results", { query: debouncedSearch })
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
                onClick={() => navigate("/phones")}
                className={cn(
                  "border-b-2 pb-1 text-sm font-semibold transition-colors",
                  section === "phones"
                    ? "border-[#2B5CB8] text-navy"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                {t("smartphones_tab_phones")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/tablets")}
                className={cn(
                  "border-b-2 pb-1 text-sm font-semibold transition-colors",
                  section === "tablets"
                    ? "border-[#2B5CB8] text-navy"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                {t("smartphones_tab_tablets")}
              </button>
            </div>
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
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5CB8]/30"
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
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h2 className="mb-1 font-display text-2xl font-bold text-navy">{productsHeading}</h2>
        <p className="mb-6 text-sm text-[#5B6B86]">{countLabel}</p>

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

        {woo &&
          !showCatalogSpinner &&
          !showSearchSpinner &&
          !searchError &&
          displayList.length === 0 && <p className="py-16 text-sm text-muted-foreground">{t("woo_empty")}</p>}

        {woo && !showSearchSpinner && !showCatalogSpinner && displayList.length > 0 && (
          <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6">
            {displayList.map((p) => (
              <li key={p.cloudId || `${p.id}-${p.slug}`}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </li>
            ))}
          </ul>
        )}

        {!woo && (
          <p className="py-16 text-sm text-muted-foreground">{t("smartphones_tablets_catalog_hint")}</p>
        )}
      </div>
    </div>
  );
}
