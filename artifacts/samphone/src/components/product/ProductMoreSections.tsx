import { useMemo } from "react";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { classifyCatalogProduct } from "@/lib/catalog-taxonomy";
import { inStockProducts } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const RAIL_LIMIT = 18;

function takeUnique(currentId: number, bags: WooProduct[][], limit = RAIL_LIMIT): WooProduct[] {
  const seen = new Set<number>([currentId]);
  const out: WooProduct[] = [];
  for (const bag of bags) {
    for (const p of inStockProducts(bag)) {
      if (!p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function cards(items: WooProduct[], priceLabel: string) {
  return items.map((p) => (
    <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={priceLabel} compact />
  ));
}

export default function ProductMoreSections({
  current,
  related,
  catalog,
}: {
  current: WooProduct;
  related: WooProduct[];
  catalog: WooProduct[];
}) {
  const { t } = useLang();
  const { keys } = useRecentlyViewed();
  const priceLabel = t("woo_price_na");
  const brand = (current.brand || "").trim();
  const model = (current.modelLabel || current.specs?.Model || "").trim();
  const pool = catalog.length ? catalog : related;
  const catKey = (current.categories ?? []).map((c) => c.id).join(",");

  const similar = useMemo(() => {
    const ids = new Set(
      catKey
        .split(",")
        .map((n) => Number(n))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
    return takeUnique(current.id, [
      related,
      pool.filter((p) => (p.categories ?? []).some((c) => ids.has(c.id))),
    ]);
  }, [current.id, related, pool, catKey]);

  const moreBrand = useMemo(() => {
    if (!brand) return [];
    const bl = brand.toLowerCase();
    return takeUnique(current.id, [pool.filter((p) => (p.brand || "").trim().toLowerCase() === bl)]);
  }, [brand, current.id, pool]);

  const moreModel = useMemo(() => {
    if (!model) return [];
    const ml = model.toLowerCase();
    return takeUnique(current.id, [
      pool.filter(
        (p) =>
          (p.modelLabel || "").toLowerCase() === ml ||
          (p.specs?.Model || "").toLowerCase() === ml ||
          p.name.toLowerCase().includes(ml),
      ),
    ]);
  }, [model, current.id, pool]);

  const accessories = useMemo(
    () =>
      takeUnique(current.id, [
        related.filter((p) => classifyCatalogProduct(p).category !== "parts"),
        pool.filter((p) => classifyCatalogProduct(p).category !== "parts"),
      ]),
    [current.id, related, pool],
  );

  const alsoBought = useMemo(() => {
    const skip = new Set<number>([current.id, ...similar.slice(0, 6).map((p) => p.id)]);
    return takeUnique(current.id, [pool.filter((p) => !skip.has(p.id))]);
  }, [current.id, pool, similar]);

  const recent = useMemo(() => {
    const byId = new Map(pool.map((p) => [p.id, p]));
    const rows: WooProduct[] = [];
    for (const key of keys) {
      if (!key.startsWith("woo:")) continue;
      const id = Number(key.slice(4).split(":")[0]);
      if (!Number.isFinite(id) || id === current.id) continue;
      const p = byId.get(id);
      if (p) rows.push(p);
    }
    return inStockProducts(rows).slice(0, RAIL_LIMIT);
  }, [keys, pool, current.id]);

  const primaryCat = current.categories?.[0];
  const brandHref = brand ? `/search?q=${encodeURIComponent(brand)}` : "/store";
  const modelHref = model ? `/search?q=${encodeURIComponent(model)}` : "/store";
  const catHref = primaryCat?.slug ? `/category/${primaryCat.slug}` : "/store";

  const accessoryCards = accessories
    .filter((p) => !similar.slice(0, 6).some((s) => s.id === p.id))
    .slice(0, RAIL_LIMIT);

  return (
    <div className="mt-8 space-y-2 border-t border-black/[0.06] pt-4">
      {similar.length >= 2 ? (
        <HomeProductRail title={t("pdp_similar_title")} seeAllHref={catHref}>
          {cards(similar, priceLabel)}
        </HomeProductRail>
      ) : null}
      {moreBrand.length >= 2 ? (
        <HomeProductRail title={t("pdp_more_brand_title", { brand })} seeAllHref={brandHref}>
          {cards(moreBrand, priceLabel)}
        </HomeProductRail>
      ) : null}
      {moreModel.length >= 2 ? (
        <HomeProductRail title={t("pdp_more_model_title", { model })} seeAllHref={modelHref}>
          {cards(moreModel, priceLabel)}
        </HomeProductRail>
      ) : null}
      {accessoryCards.length >= 2 ? (
        <HomeProductRail title={t("related_accessories_title")} seeAllHref="/accessories">
          {cards(accessoryCards, priceLabel)}
        </HomeProductRail>
      ) : null}
      {alsoBought.length >= 2 ? (
        <HomeProductRail title={t("people_also_bought_title")} seeAllHref="/store">
          {cards(alsoBought, priceLabel)}
        </HomeProductRail>
      ) : null}
      {recent.length >= 2 ? (
        <HomeProductRail title={t("recently_viewed_title")} seeAllHref="/store">
          {cards(recent, priceLabel)}
        </HomeProductRail>
      ) : null}
    </div>
  );
}
