import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { fetchCloudNewArrivals } from "@/lib/samphone-cloud";
import { sortNewest } from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";

export default function HomeNewArrivals() {
  const { t } = useLang();
  const { products, loading } = useProductCatalog();
  const [wooRows, setWooRows] = useState<WooProduct[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchCloudNewArrivals(14)
      .then((rows) => {
        if (alive) setWooRows(rows);
      })
      .catch(() => {
        if (alive) setWooRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const display = useMemo(() => {
    if (wooRows && wooRows.length > 0) return wooRows;
    return sortNewest(products).slice(0, 14);
  }, [wooRows, products]);

  if (display.length === 0 && wooRows == null && loading) {
    return (
      <HomeProductRail
        title={t("newArrivals_section_title")}
        subtitle={t("newArrivals_section_sub")}
        seeAllHref="/new"
      >
        <CatalogLoading compact />
      </HomeProductRail>
    );
  }

  if (display.length === 0) return null;

  return (
    <HomeProductRail
      title={t("newArrivals_section_title")}
      subtitle={t("newArrivals_section_sub")}
      seeAllHref="/new"
    >
      {display.map((product) => (
        <WooProductCard key={product.cloudId || product.id} product={product} priceUnavailableLabel={t("woo_price_na")} />
      ))}
    </HomeProductRail>
  );
}
