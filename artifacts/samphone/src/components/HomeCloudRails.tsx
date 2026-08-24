import { useEffect, useState } from "react";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudHomeRails, fetchCloudProductsByGroup, type CloudHomeRails } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

const EXTRA_GROUPS = [
  { key: "magsafe", title: "MagSafe", group: "MagSafe" },
  { key: "jelly", title: "Soft Jelly", group: "Soft Jelly" },
  { key: "glass", title: "Full Glue Glass", group: "Full Glue Glass" },
];

export default function HomeCloudRails() {
  const { t } = useLang();
  const [rails, setRails] = useState<CloudHomeRails | null>(null);
  const [extra, setExtra] = useState<{ key: string; title: string; group: string; items: WooProduct[] }[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchCloudHomeRails(10)
      .then((r) => {
        if (alive) setRails(r);
      })
      .catch(() => {
        if (alive) setRails({ best: [], fresh: [], sections: [] });
      });
    void Promise.all(
      EXTRA_GROUPS.map(async (g) => ({
        ...g,
        items: await fetchCloudProductsByGroup(g.group, 10),
      })),
    )
      .then((rows) => {
        if (alive) setExtra(rows.filter((r) => r.items.length > 0));
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

  return (
    <>
      {rails && rails.best.length > 0 ? (
        <HomeProductRail title={t("home_best_sellers")} seeAllHref="/store">
          {cards(rails.best)}
        </HomeProductRail>
      ) : null}
      {rails?.sections.map((s) =>
        s.items.length > 0 ? (
          <HomeProductRail
            key={s.key}
            title={s.title}
            seeAllHref={s.group ? `/group/${encodeURIComponent(s.group)}` : "/accessories"}
          >
            {cards(s.items)}
          </HomeProductRail>
        ) : null,
      )}
      {extra.map((s) => (
        <HomeProductRail key={s.key} title={s.title} seeAllHref={`/group/${encodeURIComponent(s.group)}`}>
          {cards(s.items)}
        </HomeProductRail>
      ))}
    </>
  );
}
