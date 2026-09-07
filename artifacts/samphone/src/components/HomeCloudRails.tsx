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

function mergeForTitle(title: string, apiItems: WooProduct[], catalog: WooProduct[], limit = 14): WooProduct[] {
  const fromApi = filterProductsMatchingTitle(apiItems, title, limit);
  if (fromApi.length >= limit) return fromApi;
  const seen = new Set(fromApi.map((p) => p.id));
  const extra = filterProductsMatchingTitle(catalog, title, limit + fromApi.length).filter((p) => !seen.has(p.id));
  return [...fromApi, ...extra].slice(0, limit);
}

export default function HomeCloudRails() {
  const { t } = useLang();
  const { products: catalog } = useProductCatalog();
  const [rails, setRails] = useState<CloudHomeRails | null>(null);
  const [extra, setExtra] = useState<{ key: string; title: string; group: string; items: WooProduct[] }[] | null>(
    null,
  );

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
          return { key: g.key, title: g.title, group: g.group, items: page.items };
        } catch {
          return { key: g.key, title: g.title, group: g.group, items: [] as WooProduct[] };
        }
      }),
    ).then((rows) => {
      if (alive) setExtra(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} />);

  const extraRows = useMemo(() => {
    if (!extra) return [];
    return extra
      .map((s) => ({
        ...s,
        items: mergeForTitle(s.title, s.items, catalog),
      }))
      .filter((s) => s.items.length > 0);
  }, [extra, catalog]);

  if (rails == null || extra == null) {
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
