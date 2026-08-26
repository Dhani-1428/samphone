import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { LayoutGrid, Loader2 } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import ModelHeroBanner from "@/components/ModelHeroBanner";
import { CatalogBackLink, CatalogSectionHeading, CatalogTypeChip } from "@/components/CatalogPageChrome";
import { groupIcon, subtypeIcon } from "@/components/AccessoryFilterChip";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterCatalogForCustomer } from "@/lib/customer-price";
import {
  accessoryPageCopy,
  accessoryPageHref,
  findAccessoryPage,
  productMatchesSubtype,
  shopGroupFetchQueries,
} from "@/data/accessory-pages";
import { fetchCloudMergedProducts } from "@/lib/samphone-cloud";
import { getPrimaryImageUrl } from "@/lib/woocommerce";
import { sortByPrice } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

function shopHref(forcedGroup: string | undefined, group: string, subtype?: string): string {
  if (forcedGroup === "Cards") {
    return subtype ? `/cards?type=${encodeURIComponent(subtype)}` : "/cards";
  }
  if (forcedGroup === "Repairing Tools") {
    return subtype ? `/tools?type=${encodeURIComponent(subtype)}` : "/tools";
  }
  return accessoryPageHref(group, subtype);
}

export default function ShopGroupPage({ forcedGroup }: { forcedGroup?: string } = {}) {
  const params = useParams<{ group: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const group = (forcedGroup ?? decodeURIComponent(params.group ?? "")).trim();
  const page = findAccessoryPage(group);
  const typeParam = new URLSearchParams(search).get("type") ?? "";
  const { t } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<WooProduct[] | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchGroup = page?.group ?? group;

  useEffect(() => {
    let alive = true;
    setItems(null);
    setCatalogTotal(0);
    setLoadingMore(true);
    if (!fetchGroup) {
      setItems([]);
      setLoadingMore(false);
      return;
    }
    void fetchCloudMergedProducts(shopGroupFetchQueries(fetchGroup), (list, total) => {
      if (!alive) return;
      setCatalogTotal(total);
      setItems([...list]);
    })
      .then((list) => {
        if (!alive) return;
        setItems(list);
        setCatalogTotal(list.length);
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
  }, [fetchGroup]);

  const subtype = page?.subtypes.find((s) => s.label === typeParam) ?? null;
  const copy = page ? accessoryPageCopy(page) : { blurb: t("home_accessories_sub"), typesLabel: t("home_accessories_title") };

  const visible = useMemo(() => {
    const list = filterCatalogForCustomer(items ?? [], user);
    const filtered = subtype ? list.filter((p) => productMatchesSubtype(p, subtype)) : list;
    return sortByPrice(filtered, "asc", user);
  }, [items, subtype, user]);

  const heroImages = useMemo(() => {
    const urls: string[] = [];
    const list = items ?? [];
    if (page) {
      for (const s of page.subtypes) {
        const match = list.find((p) => productMatchesSubtype(p, s));
        const src = match ? getPrimaryImageUrl(match) : null;
        if (src && !urls.includes(src)) urls.push(src);
        if (urls.length >= 2) return urls;
      }
    }
    for (const p of list) {
      const src = getPrimaryImageUrl(p);
      if (src && !urls.includes(src)) urls.push(src);
      if (urls.length >= 2) break;
    }
    return urls;
  }, [items, page]);

  const title = page?.label ?? group ?? t("home_accessories_title");
  const countLabel =
    !subtype && loadingMore && catalogTotal > (items?.length ?? 0)
      ? t("accessory_product_count_of", { count: items?.length ?? 0, total: catalogTotal })
      : t("accessory_product_count", { count: visible.length });

  const goAll = () => {
    navigate(shopHref(forcedGroup, page?.group ?? group));
  };

  const goType = (label: string) => {
    navigate(shopHref(forcedGroup, page?.group ?? group, label));
  };

  const headingHint = items == null ? t("woo_loading") : countLabel;

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-28">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <ModelHeroBanner
          crumbs={[t("accessory_breadcrumb_home"), t("home_accessories_title"), title]}
          title={title}
          description={copy.blurb}
          images={heroImages}
        />

        <CatalogBackLink />

        <section>
          <CatalogSectionHeading
            icon={groupIcon(page?.group ?? title)}
            title={page && page.subtypes.length > 0 ? copy.typesLabel : title}
            hint={headingHint}
          />
          {page && page.subtypes.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              <CatalogTypeChip active={!subtype} onClick={goAll} icon={LayoutGrid}>
                {t("model_filter_all")}
              </CatalogTypeChip>
              {page.subtypes.map((s) => (
                <CatalogTypeChip
                  key={s.label}
                  active={subtype?.label === s.label}
                  onClick={() => goType(s.label)}
                  icon={subtypeIcon(s.label)}
                >
                  {s.label}
                </CatalogTypeChip>
              ))}
            </div>
          ) : null}
        </section>

        <div>
          {items == null ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">{t("woo_loading")}</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("productNotFound")}</p>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((p) => (
                <WooProductCard
                  key={p.cloudId || `${p.id}-${p.slug}`}
                  product={p}
                  priceUnavailableLabel={t("woo_price_na")}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
