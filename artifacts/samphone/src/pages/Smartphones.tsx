import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import CatalogLoading from "@/components/CatalogLoading";
import {
  CatalogFilterAside,
  CatalogFilterLayout,
  FilterSection,
} from "@/components/CatalogListFilters";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useLang } from "@/contexts/LanguageContext";
import { SMARTPHONE_FETCH_QUERIES, TABLET_FETCH_QUERIES } from "@/data/device-catalog";
import { searchProductsQuery, type WooProduct } from "@/lib/woocommerce";
import { fetchCloudMergedProducts } from "@/lib/samphone-cloud";
import {
  filterCatalogForSmartphonesTab,
  sortByPrice,
} from "@/lib/woo-product-filters";

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
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
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

  const activeCount = (debouncedSearch ? 1 : 0) + (section === "tablets" ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <SmartphonesHeader section={section} />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <CatalogFilterLayout
          activeCount={activeCount}
          sidebar={
            <CatalogFilterAside
              onClear={
                debouncedSearch || section === "tablets"
                  ? () => {
                      clearSearch();
                      navigate("/phones");
                    }
                  : undefined
              }
            >
              <FilterSection title="Device">
                <div className="flex flex-col gap-2">
                  <CatalogTypeChip active={section === "phones"} onClick={() => navigate("/phones")}>
                    {t("smartphones_tab_phones")}
                  </CatalogTypeChip>
                  <CatalogTypeChip active={section === "tablets"} onClick={() => navigate("/tablets")}>
                    {t("smartphones_tab_tablets")}
                  </CatalogTypeChip>
                </div>
              </FilterSection>
              <FilterSection title="Search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t("smartphones_search_brand")}
                    autoComplete="off"
                    enterKeyHint="search"
                    aria-label={t("smartphones_search_brand")}
                    className="w-full rounded-md border border-black/[0.12] py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      aria-label={t("smartphones_search_clear")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </FilterSection>
            </CatalogFilterAside>
          }
        >
          <h2 className="mb-1 font-display text-2xl font-bold text-navy">{productsHeading}</h2>
          <p className="mb-6 text-sm text-[#5B6B86]">{countLabel}</p>

          {showSyncBanner ? (
            <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
              {t("woo_syncing_more")}
            </p>
          ) : null}

          {searchError ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {searchError}
            </p>
          ) : null}

          {showSearchSpinner ? <CatalogLoading label={t("smartphones_search_loading")} /> : null}

          {showCatalogSpinner ? <CatalogLoading /> : null}

          {woo &&
          !showCatalogSpinner &&
          !showSearchSpinner &&
          !searchError &&
          displayList.length === 0 ? (
            <p className="py-16 text-sm text-muted-foreground">{t("woo_empty")}</p>
          ) : null}

          {woo && !showSearchSpinner && !showCatalogSpinner && displayList.length > 0 ? (
            <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {displayList.map((p) => (
                <li key={p.cloudId || `${p.id}-${p.slug}`}>
                  <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
                </li>
              ))}
            </ul>
          ) : null}

          {!woo ? (
            <p className="py-16 text-sm text-muted-foreground">{t("smartphones_tablets_catalog_hint")}</p>
          ) : null}
        </CatalogFilterLayout>
      </div>
    </div>
  );
}
