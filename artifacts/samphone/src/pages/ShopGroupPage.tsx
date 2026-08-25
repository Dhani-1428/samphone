import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { useLang } from "@/contexts/LanguageContext";
import {
  accessoryPageHref,
  findAccessoryPage,
  productMatchesSubtype,
} from "@/data/accessory-pages";
import { fetchCloudAllProducts } from "@/lib/samphone-cloud";
import { sortByPrice } from "@/lib/woo-product-filters";
import { cn } from "@/lib/utils";
import type { WooProduct } from "@/lib/woocommerce";

export default function ShopGroupPage({ forcedGroup }: { forcedGroup?: string } = {}) {
  const params = useParams<{ group: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const group = (forcedGroup ?? decodeURIComponent(params.group ?? "")).trim();
  const page = findAccessoryPage(group);
  const typeParam = new URLSearchParams(search).get("type") ?? "";
  const { t } = useLang();
  const [items, setItems] = useState<WooProduct[] | null>(null);
  const fetchGroup = page?.group ?? group;

  useEffect(() => {
    let alive = true;
    setItems(null);
    if (!fetchGroup) {
      setItems([]);
      return;
    }
    void fetchCloudAllProducts({ category_group: fetchGroup })
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [fetchGroup]);

  const subtype = page?.subtypes.find((s) => s.label === typeParam) ?? null;

  const visible = useMemo(() => {
    const list = items ?? [];
    const filtered = subtype ? list.filter((p) => productMatchesSubtype(p, subtype)) : list;
    return sortByPrice(filtered, "asc");
  }, [items, subtype]);

  const title = page?.label ?? group ?? t("home_accessories_title");
  const description = page?.group === "Hoco" ? t("shop_hoco_sub") : t("home_accessories_sub");

  return (
    <div className="min-h-screen">
      <PageVideoHero eyebrow={t("home_accessories_title")} title={title} description={description} />
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>

        {page && page.subtypes.length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 border-b border-black/[0.06]">
            <button
              type="button"
              onClick={() => navigate(forcedGroup === "Cards" ? "/cards" : accessoryPageHref(page.group))}
              className={cn(
                "border-b-2 pb-2 text-sm transition-colors",
                !subtype ? "border-[#5A73A8] font-semibold text-navy" : "border-transparent text-muted-foreground hover:text-navy",
              )}
            >
              {t("accessory_filter_all")}
            </button>
            {page.subtypes.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() =>
                  navigate(
                    forcedGroup === "Cards"
                      ? `/cards?type=${encodeURIComponent(s.label)}`
                      : accessoryPageHref(page.group, s.label),
                  )
                }
                className={cn(
                  "border-b-2 pb-2 text-sm transition-colors",
                  subtype?.label === s.label
                    ? "border-[#5A73A8] font-semibold text-navy"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        {items == null ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("productNotFound")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => (
              <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
