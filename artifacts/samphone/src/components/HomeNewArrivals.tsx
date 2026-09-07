import { useMemo } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { sortNewest } from "@/lib/woo-product-filters";

export default function HomeNewArrivals() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();
  const wooRows = useMemo(() => (woo ? sortNewest(products).slice(0, 14) : []), [woo, products]);

  if (woo && loading && wooRows.length === 0) {
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

  if (wooRows.length === 0) return null;

  return (
    <HomeProductRail
      title={t("newArrivals_section_title")}
      subtitle={t("newArrivals_section_sub")}
      seeAllHref="/new"
    >
      {wooRows.map((product) => (
        <WooProductCard key={product.id} product={product} priceUnavailableLabel={t("woo_price_na")} />
      ))}
    </HomeProductRail>
  );
}
