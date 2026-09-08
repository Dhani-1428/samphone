import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { fetchCloudFeatured } from "@/lib/samphone-cloud";
import { sortNewest } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

export default function Products() {
  const { t } = useLang();
  const { products, loading } = useProductCatalog();
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

  const display = useMemo(() => {
    if (featured && featured.length > 0) return featured;
    return sortNewest(products).slice(0, 14);
  }, [featured, products]);

  if (display.length === 0 && loading) {
    return (
      <div id="products">
        <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
          <CatalogLoading compact />
        </HomeProductRail>
      </div>
    );
  }

  if (display.length === 0) return null;

  return (
    <div id="products">
      <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
        {display.map((p) => (
          <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
        ))}
      </HomeProductRail>
    </div>
  );
}
