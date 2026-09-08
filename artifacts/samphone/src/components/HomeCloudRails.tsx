import { useEffect, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudHomeRails, fetchCloudProductList, type CloudHomeRails } from "@/lib/samphone-cloud";
import { pickHomeRailItems, type HomeRailKey } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const HOME_CATEGORY_RAILS: {
  key: HomeRailKey;
  title: string;
  group: string;
  query: Record<string, string>;
}[] = [
  { key: "repair-tools", title: "Repair Tools", group: "Repairing Tools", query: { category_group: "Repairing Tools" } },
  { key: "memory-cards", title: "Memory Cards", group: "Cards", query: { category_group: "Cards" } },
  { key: "adapters", title: "Adapters", group: "Chargers", query: { leaf_category: "Adapters" } },
  { key: "car-support", title: "Mobile Car Support", group: "Mobile Car Support", query: { category_group: "Mobile Car" } },
  { key: "magsafe-covers", title: "MagSafe Covers", group: "Original Accessories", query: { q: "magsafe cover" } },
  { key: "wireless-headsets", title: "Wireless Headsets", group: "Headphones", query: { category_group: "Headphones" } },
  { key: "power-bank", title: "Power Bank", group: "Powerbanks", query: { category_group: "Powerbanks" } },
  { key: "cables", title: "Cables", group: "Cables", query: { category_group: "Cables" } },
  { key: "screen-protectors", title: "Screen Protectors", group: "Original Accessories", query: { q: "tempered glass" } },
  { key: "phone-cases", title: "Phone Cases", group: "Original Accessories", query: { q: "phone case" } },
  { key: "chargers", title: "Chargers", group: "Chargers", query: { category_group: "Chargers" } },
];

type RailRow = { key: HomeRailKey; title: string; group: string; items: WooProduct[] };

function takeRail(items: WooProduct[] | undefined, key: HomeRailKey, limit = 14): WooProduct[] {
  return pickHomeRailItems(items ?? [], key, limit);
}

export default function HomeCloudRails() {
  const { t } = useLang();
  const [best, setBest] = useState<WooProduct[]>([]);
  const [rows, setRows] = useState<RailRow[] | null>(null);

  useEffect(() => {
    let alive = true;

    void fetchCloudHomeRails(14, "priority")
      .then((r: CloudHomeRails) => {
        if (alive && r.best.length) setBest(r.best);
      })
      .catch(() => {
        /* sections fetch still fills category rows */
      });

    void Promise.all(
      HOME_CATEGORY_RAILS.map(async (g) => {
        let items: WooProduct[] = [];
        try {
          const page = await fetchCloudProductList(g.query, 24);
          items = takeRail(page.items, g.key);
        } catch {
          items = [];
        }
        if (items.length < 4 && g.query.q) {
          try {
            const page = await fetchCloudProductList({ q: g.title }, 24);
            items = takeRail([...items, ...page.items], g.key);
          } catch {
            /* keep what we have */
          }
        }
        return { key: g.key, title: g.title, group: g.group, items };
      }),
    ).then((next) => {
      if (alive) setRows(next.filter((s) => s.items.length > 0));
    });

    return () => {
      alive = false;
    };
  }, []);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} />);

  if (rows == null && best.length === 0) {
    return <CatalogLoading compact className="bg-[#F4F6F8]" />;
  }

  return (
    <>
      {best.length > 0 ? (
        <HomeProductRail title={t("home_best_sellers")} seeAllHref="/store">
          {cards(best)}
        </HomeProductRail>
      ) : null}
      {(rows ?? []).map((s) => (
        <HomeProductRail key={s.key} title={s.title} seeAllHref={`/group/${encodeURIComponent(s.group)}`}>
          {cards(s.items)}
        </HomeProductRail>
      ))}
    </>
  );
}
