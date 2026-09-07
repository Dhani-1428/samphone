import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { fetchCloudHomeRails, fetchCloudProductsByGroup, type CloudHomeRails } from "@/lib/samphone-cloud";
import { filterProductsMatchingTitle } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const EXTRA_GROUPS = [
  { key: "hoco", title: "Hoco", group: "Hoco" },
  { key: "magsafe", title: "MagSafe", group: "MagSafe" },
  { key: "jelly", title: "Soft Jelly", group: "Soft Jelly" },
  { key: "glass", title: "Full Glue Glass", group: "Full Glue Glass" },
];

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
      EXTRA_GROUPS.map(async (g) => ({
        ...g,
        items: await fetchCloudProductsByGroup(g.group, 24),
      })),
    )
      .then((rows) => {
        if (alive) setExtra(rows);
      })
      .catch(() => {
        if (alive) setExtra([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} />);

  const sectionRows = useMemo(() => {
    if (!rails) return [];
    return rails.sections
      .map((s) => ({
        ...s,
        items: mergeForTitle(s.title || s.group || s.key, s.items, catalog),
      }))
      .filter((s) => s.items.length > 0);
  }, [rails, catalog]);

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
      {sectionRows.map((s) => (
        <HomeProductRail
          key={s.key}
          title={s.title}
          seeAllHref={s.group ? `/group/${encodeURIComponent(s.group)}` : "/accessories"}
        >
          {cards(s.items)}
        </HomeProductRail>
      ))}
      {extraRows.map((s) => (
        <HomeProductRail key={s.key} title={s.title} seeAllHref={`/group/${encodeURIComponent(s.group)}`}>
          {cards(s.items)}
        </HomeProductRail>
      ))}
    </>
  );
}
