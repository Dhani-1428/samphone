import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { fetchCloudHomeRails, type CloudHomeRails } from "@/lib/samphone-cloud";
import { filterProductsMatchingTitle } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const HOME_CATEGORY_RAILS = [
  { key: "repair-tools", title: "Repair Tools", group: "Repairing Tools" },
  { key: "memory-cards", title: "Memory Cards", group: "Cards" },
  { key: "adapters", title: "Adapters", group: "Chargers" },
  { key: "car-support", title: "Mobile Car Support", group: "Mobile Car Support" },
  { key: "magsafe-covers", title: "MagSafe Covers", group: "Original Accessories" },
  { key: "wireless-headsets", title: "Wireless Headsets", group: "Headphones" },
  { key: "power-bank", title: "Power Bank", group: "Powerbanks" },
  { key: "cables", title: "Cables", group: "Cables" },
  { key: "screen-protectors", title: "Screen Protectors", group: "Original Accessories" },
  { key: "phone-cases", title: "Phone Cases", group: "Original Accessories" },
  { key: "chargers", title: "Chargers", group: "Chargers" },
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
  const { products: catalog, loading } = useProductCatalog();
  const [rails, setRails] = useState<CloudHomeRails>({ best: [], fresh: [], sections: [] });
  const [priorityReady, setPriorityReady] = useState(false);
  const [sectionsReady, setSectionsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchCloudHomeRails(14, "priority")
      .then((r) => {
        if (!alive) return;
        setRails((prev) => ({
          best: r.best,
          fresh: r.fresh.length ? r.fresh : prev.fresh,
          sections: prev.sections,
        }));
        setPriorityReady(true);
      })
      .catch(() => {
        if (alive) setPriorityReady(true);
      });
    void fetchCloudHomeRails(14, "sections")
      .then((r) => {
        if (!alive) return;
        setRails((prev) => ({
          best: prev.best.length ? prev.best : r.best,
          fresh: prev.fresh.length ? prev.fresh : r.fresh,
          sections: r.sections,
        }));
        setSectionsReady(true);
      })
      .catch(() => {
        if (alive) setSectionsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} />);

  const extraRows = useMemo(() => {
    const fromHome = new Map(rails.sections.map((s) => [s.key, s.items]));
    return HOME_CATEGORY_RAILS.map((g) => ({
      key: g.key,
      title: g.title,
      group: g.group,
      items: mergeRailItems(fromHome.get(g.key) ?? [], catalog, g.title),
    })).filter((s) => s.items.length > 0);
  }, [rails, catalog]);

  const waiting =
    extraRows.length === 0 &&
    rails.best.length === 0 &&
    (loading || (!priorityReady && !sectionsReady));
  if (waiting) {
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
