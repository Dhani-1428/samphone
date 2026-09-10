import { useEffect, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { pricingAudience } from "@/lib/customer-price";
import { shopGroupFetchQueries } from "@/data/accessory-pages";
import { fetchCloudHomeRails, fetchCloudProductList, type CloudHomeRails } from "@/lib/samphone-cloud";
import { pickHomeRailItems, type HomeRailKey } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

const HOME_CATEGORY_RAILS: {
  key: HomeRailKey;
  title: string;
  group: string;
  query: Record<string, string>;
}[] = [
  { key: "wireless-headsets", title: "Headphones", group: "Headphones", query: { category_group: "Headphones" } },
  { key: "repair-tools", title: "Repair Tools", group: "Repairing Tools", query: { category_group: "Repairing Tools" } },
  { key: "memory-cards", title: "Memory Cards", group: "Cards", query: { category_group: "Cards" } },
  { key: "adapters", title: "Adapters", group: "Chargers", query: { leaf_category: "Adapters" } },
  { key: "car-support", title: "Mobile Car Support", group: "Mobile Car Support", query: { category_group: "Mobile Car" } },
  { key: "magsafe-covers", title: "MagSafe Covers", group: "Original Accessories", query: { q: "magsafe cover" } },
  { key: "power-bank", title: "Power Bank", group: "Powerbanks", query: { category_group: "Powerbanks" } },
  { key: "cables", title: "Cables", group: "Cables", query: { category_group: "Cables" } },
  { key: "screen-protectors", title: "Screen Protectors", group: "Original Accessories", query: { q: "tempered glass" } },
  { key: "chargers", title: "Chargers", group: "Chargers", query: { category_group: "Chargers" } },
];

type RailRow = { key: HomeRailKey; title: string; group: string; items: WooProduct[] };

function takeRail(items: WooProduct[] | undefined, key: HomeRailKey, limit = 18): WooProduct[] {
  return pickHomeRailItems(items ?? [], key, limit);
}

function mergeRailProducts(bags: WooProduct[][]): WooProduct[] {
  const out: WooProduct[] = [];
  const seen = new Set<string>();
  for (const bag of bags) {
    for (const p of bag) {
      const key = String(p.cloudId || p.id || p.slug || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

async function loadRailProducts(g: (typeof HOME_CATEGORY_RAILS)[number]): Promise<WooProduct[]> {
  const headphoneRail = g.key === "wireless-headsets";
  const queries = headphoneRail ? shopGroupFetchQueries(g.group) : [g.query];
  const pageSize = headphoneRail ? 48 : 24;
  const bags = await Promise.all(
    queries.map((query) =>
      fetchCloudProductList(query, pageSize)
        .then((page) => page.items)
        .catch(() => [] as WooProduct[]),
    ),
  );
  let pool = mergeRailProducts(bags);
  let items = takeRail(pool, g.key);
  if (headphoneRail && items.length < 8) {
    try {
      const extra = await fetchCloudProductList({ q: "headphones" }, 48);
      pool = mergeRailProducts([pool, extra.items]);
      items = takeRail(pool, g.key);
    } catch {
      /* keep what we have */
    }
  }
  if (headphoneRail && items.length < 8) {
    items = pool.slice(0, 18);
  }
  return items;
}

export default function HomeCloudRails() {
  const { t } = useLang();
  const { user } = useAuth();
  const audience = pricingAudience(user);
  const [best, setBest] = useState<WooProduct[]>([]);
  const [bestPending, setBestPending] = useState(true);
  const [rows, setRows] = useState<RailRow[]>(() =>
    HOME_CATEGORY_RAILS.map((g) => ({ key: g.key, title: g.title, group: g.group, items: [] })),
  );
  const [pendingKeys, setPendingKeys] = useState(() => new Set(HOME_CATEGORY_RAILS.map((g) => g.key)));

  useEffect(() => {
    let alive = true;

    void fetchCloudHomeRails(18, "priority")
      .then((r: CloudHomeRails) => {
        if (alive && r.best.length) setBest(r.best);
      })
      .catch(() => {
        /* category rows still render */
      })
      .finally(() => {
        if (alive) setBestPending(false);
      });

    void Promise.allSettled(
      HOME_CATEGORY_RAILS.map(async (g) => {
        let items: WooProduct[] = [];
        try {
          items = await loadRailProducts(g);
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
        if (!alive) return;
        setRows((prev) => prev.map((row) => (row.key === g.key ? { ...row, items } : row)));
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(g.key);
          return next;
        });
      }),
    );

    return () => {
      alive = false;
    };
  }, [audience]);

  const label = t("woo_price_na");
  const cards = (items: WooProduct[]) =>
    items.map((p) => (
      <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={label} compact />
    ));

  return (
    <>
      {best.length > 0 ? (
        <HomeProductRail title={t("home_best_sellers")} seeAllHref="/store">
          {cards(best)}
        </HomeProductRail>
      ) : bestPending ? (
        <HomeProductRail title={t("home_best_sellers")} seeAllHref="/store">
          <CatalogLoading compact />
        </HomeProductRail>
      ) : null}
      {rows.map((s) =>
        s.items.length > 0 || pendingKeys.has(s.key) ? (
          <HomeProductRail key={s.key} title={s.title} seeAllHref={`/group/${encodeURIComponent(s.group)}`}>
            {s.items.length > 0 ? cards(s.items) : <CatalogLoading compact />}
          </HomeProductRail>
        ) : null,
      )}
    </>
  );
}
