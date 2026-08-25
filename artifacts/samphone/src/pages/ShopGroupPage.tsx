import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { ChevronRight, GitBranch, Loader2 } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import CatalogImage from "@/components/CatalogImage";
import { FilterChip, subtypeIcon } from "@/components/AccessoryFilterChip";
import { useLang } from "@/contexts/LanguageContext";
import {
  accessoryPageCopy,
  accessoryPageHref,
  findAccessoryPage,
  productMatchesSubtype,
} from "@/data/accessory-pages";
import { fetchCloudAllProducts } from "@/lib/samphone-cloud";
import { getPrimaryImageUrl } from "@/lib/woocommerce";
import { sortByPrice } from "@/lib/woo-product-filters";
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
  const gridRef = useRef<HTMLDivElement>(null);

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
  const copy = page ? accessoryPageCopy(page) : { blurb: t("home_accessories_sub"), typesLabel: t("home_accessories_title") };

  const visible = useMemo(() => {
    const list = items ?? [];
    const filtered = subtype ? list.filter((p) => productMatchesSubtype(p, subtype)) : list;
    return sortByPrice(filtered, "asc");
  }, [items, subtype]);

  const heroImages = useMemo(() => {
    const urls: string[] = [];
    for (const p of items ?? []) {
      const src = getPrimaryImageUrl(p);
      if (src && !urls.includes(src)) urls.push(src);
      if (urls.length >= 2) break;
    }
    return urls;
  }, [items]);

  const title = page?.label ?? group ?? t("home_accessories_title");

  const goAll = () => {
    navigate(forcedGroup === "Cards" ? "/cards" : accessoryPageHref(page?.group ?? group));
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goType = (label: string) => {
    navigate(
      forcedGroup === "Cards"
        ? `/cards?type=${encodeURIComponent(label)}`
        : accessoryPageHref(page?.group ?? group, label),
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white px-6 py-8 sm:px-10 md:px-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_minmax(220px,38%)]">
            <div>
              <p className="mb-3 text-[13px] text-muted-foreground">
                {t("accessory_breadcrumb_home")}
                <span className="mx-1.5">›</span>
                {t("home_accessories_title")}
                <span className="mx-1.5">›</span>
                {title}
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-navy md:text-5xl">{title}</h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{copy.blurb}</p>
            </div>
            <div className="relative mx-auto flex h-44 w-full max-w-sm items-center justify-center md:h-52">
              <div className="absolute size-40 rounded-full bg-[#D6E4FF] md:size-48" aria-hidden />
              <div className="absolute size-28 rounded-full bg-white/50 md:size-36" aria-hidden />
              {heroImages[0] ? (
                <CatalogImage
                  src={heroImages[0]}
                  alt=""
                  className="relative z-[1] h-32 w-32 object-contain drop-shadow-md md:h-40 md:w-40"
                />
              ) : null}
              {heroImages[1] ? (
                <CatalogImage
                  src={heroImages[1]}
                  alt=""
                  className="absolute bottom-2 right-6 z-[2] h-20 w-20 object-contain drop-shadow-md md:h-24 md:w-24"
                />
              ) : null}
            </div>
          </div>
        </section>

        {page && page.subtypes.length > 0 ? (
          <section className="rounded-2xl border border-black/[0.08] bg-white px-5 py-4 sm:px-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{copy.typesLabel}</p>
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip active={!subtype} onClick={goAll}>
                {t("accessory_filter_all")}
              </FilterChip>
              {page.subtypes.map((s) => (
                <FilterChip
                  key={s.label}
                  active={subtype?.label === s.label}
                  onClick={() => goType(s.label)}
                  icon={subtypeIcon(s.label)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>
          </section>
        ) : null}

        <div ref={gridRef}>
          {items == null ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("productNotFound")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
              {visible.map((p) => (
                <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
              ))}
            </div>
          )}
        </div>

        {visible.length > 0 ? (
          <div className="flex justify-center pt-2 pb-6">
            <button
              type="button"
              onClick={goAll}
              className="inline-flex items-center gap-3 rounded-full border border-[#5A73A8]/25 bg-[#E8EEF7] px-6 py-3 text-sm font-semibold text-[#5A73A8] transition-colors hover:bg-[#dce6f4]"
            >
              <GitBranch className="h-4 w-4" strokeWidth={2} />
              {t("accessory_explore", { group: title.toLowerCase() })}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
