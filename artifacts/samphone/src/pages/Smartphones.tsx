import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import WooProductCard from "@/components/wc/WooProductCard";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useLang } from "@/contexts/LanguageContext";
import { SMARTPHONE_FETCH_QUERIES, TABLET_FETCH_QUERIES } from "@/data/device-catalog";
import type { WooProduct } from "@/lib/woocommerce";
import { fetchCloudMergedProducts } from "@/lib/samphone-cloud";
import {
  filterCatalogForSmartphonesTab,
  sortByPrice,
} from "@/lib/woo-product-filters";

type DeviceSection = "phones" | "tablets";

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
  const [location] = useLocation();
  const section = sectionFromPath(location);

  const [items, setItems] = useState<WooProduct[] | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const catalogList = useMemo(() => sortByPrice(items ?? [], "asc"), [items]);
  const loading = items == null;
  const showCatalogSpinner = woo && loading;
  const showSyncBanner = woo && loadingMore && catalogList.length > 0;

  const countLabel =
    loadingMore && catalogTotal > catalogList.length
      ? t("accessory_product_count_of", { count: catalogList.length, total: catalogTotal })
      : t("accessory_product_count", { count: catalogList.length });

  const productsHeading =
    section === "tablets" ? t("smartphones_hero_tablets_title") : t("smartphones_hero_phones_title");

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h1 className="mb-1 font-display text-2xl font-bold text-navy">{productsHeading}</h1>
        <p className="mb-6 text-sm text-[#5B6B86]">{countLabel}</p>

        {showSyncBanner ? (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            {t("woo_syncing_more")}
          </p>
        ) : null}

        {showCatalogSpinner ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        ) : null}

        {woo && !showCatalogSpinner && catalogList.length === 0 ? (
          <p className="py-16 text-sm text-muted-foreground">{t("woo_empty")}</p>
        ) : null}

        {woo && !showCatalogSpinner && catalogList.length > 0 ? (
          <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6">
            {catalogList.map((p) => (
              <li key={p.cloudId || `${p.id}-${p.slug}`}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </li>
            ))}
          </ul>
        ) : null}

        {!woo ? (
          <p className="py-16 text-sm text-muted-foreground">{t("smartphones_tablets_catalog_hint")}</p>
        ) : null}
      </div>
    </div>
  );
}
