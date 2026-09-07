import { useEffect, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudFeatured } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

export default function Products() {
  const { t } = useLang();
  const [featured, setFeatured] = useState<WooProduct[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchCloudFeatured(14)
      .then((rows) => {
        if (alive) setFeatured(rows);
      })
      .catch(() => {
        if (alive) setFeatured([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (featured == null) {
    return (
      <div id="products">
        <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
          <CatalogLoading compact />
        </HomeProductRail>
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div id="products">
      <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
        {featured.map((p) => (
          <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
        ))}
      </HomeProductRail>
    </div>
  );
}
