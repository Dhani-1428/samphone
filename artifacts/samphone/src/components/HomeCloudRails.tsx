import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { fetchCloudHomeRails, fetchCloudProductList, type CloudHomeRails } from "@/lib/samphone-cloud";
import { filterProductsMatchingTitle } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const HOME_CATEGORY_RAILS = [
  { key: "repair-tools", title: "Repair Tools", group: "Repairing Tools", query: { category_group: "Repairing Tools" } },
  { key: "memory-cards", title: "Memory Cards", group: "Cards", query: { category_group: "Cards" } },
  { key: "adapters", title: "Adapters", group: "Chargers", query: { leaf_category: "Adapters" } },
  { key: "car-support", title: "Mobile Car Support", group: "Mobile Car Support", query: { category_group: "Mobile Car" } },
  { key: "magsafe-covers", title: "MagSafe Covers", group: "Original Accessories", query: { q: "magsafe" } },
  { key: "wireless-headsets", title: "Wireless Headsets", group: "Headphones", query: { category_group: "Headphones" } },
  { key: "power-bank", title: "Power Bank", group: "Powerbanks", query: { category_group: "Powerbanks" } },
  { key: "cables", title: "Cables", group: "Cables", query: { category_group: "Cables" } },
  { key: "screen-protectors", title: "Screen Protectors", group: "Original Accessories", query: { q: "tempered glass" } },
  { key: "phone-cases", title: "Phone Cases", group: "Original Accessories", query: { q: "phone case" } },
  { key: "chargers", title: "Chargers", group: "Chargers", query: { category_group: "Chargers" } },
] as const;

function mergeRailItems(apiItems: WooProduct[], catalog: WooProduct[], title: string, limit = 14): WooProduct[] {
  const out: WooProduct[] = [];
  const seen = new Set<number>();
  for (const p of apiItems) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  if (out.length >= 4) return out;
  for (const p of filterProductsMatchingTitle(catalog, title, limit + out.length)) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export default function HomeCloudRails() {
  const { t } = useLang();
  const { products: catalog } = useProductCatalog();
  const [rails, setRails] = useState<CloudHomeRails | null>(null);
  const [extra, setExtra] = useState<Record<string, WooProduct[]>>({});

  useEffect(() => {
    let alive = true;
    void fetchCloudHomeRails(14)
      .then((r) => {
        if (alive) setRails(r);
      })
      .catch(() => {
        if (alive) setRails({ best: [], fresh: [], sections: [] });
      });
    void Promise.all(
      HOME_CATEGORY_RAILS.map(async (g) => {
        try {
          const page = await fetchCloudProductList({ ...g.query }, 24);
          return [g.key, page.items] as const;
        } catch {
          return [g.key, [] as WooProduct[]] as const;
        }
      }),
    ).then((rows) => {
      if (!alive) return;
      const next: Record<string, WooProduct[]> = {};
      for (const [key, items] of rows) next[key] = items;
      setExtra(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} />);

  const extraRows = useMemo(() => {
    const fromHome = new Map((rails?.sections ?? []).map((s) => [s.key, s.items]));
    return HOME_CATEGORY_RAILS.map((g) => {
      const apiItems = extra[g.key]?.length ? extra[g.key] : fromHome.get(g.key) ?? [];
      return {
        key: g.key,
        title: g.title,
        group: g.group,
        items: mergeRailItems(apiItems, catalog, g.title),
      };
    }).filter((s) => s.items.length > 0);
  }, [rails, extra, catalog]);

  if (rails == null) {
    return <CatalogLoading compact className="bg-[#F4F6F8]" />;
  }

  return (
    <>
      {rails.best.length > 0 ? (
        <HomeProductRail title={t("home_best_sellers")} seeAllHref="/store">
          {cards(rails.best)}
        </HomeProductRail>
      ) : null}
      {extraRows.map((s) => (
        <HomeProductRail key={s.key} title={s.title} seeAllHref={`/group/${encodeURIComponent(s.group)}`}>
          {cards(s.items)}
        </HomeProductRail>
      ))}
    </>
  );
}
