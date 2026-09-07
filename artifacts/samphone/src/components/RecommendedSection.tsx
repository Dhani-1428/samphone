import { useMemo } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import WooProductCard from "@/components/wc/WooProductCard";
import { filterAccessoryCatalog, sortNewest } from "@/lib/woo-product-filters";

export default function RecommendedSection() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();

  const wooSlice = useMemo(() => {
    if (!(woo && products.length > 0)) return [];
    const accessories = filterAccessoryCatalog(products);
    const pool = accessories.length > 0 ? accessories : products.filter((p) => p.on_sale);
    return sortNewest(pool).slice(0, 14);
  }, [woo, products]);

  if (woo && loading && wooSlice.length === 0) {
    return (
      <HomeProductRail
        title={t("favorite_section_title")}
        subtitle={t("favorite_section_sub")}
        seeAllHref="/accessories"
      >
        <CatalogLoading compact />
      </HomeProductRail>
    );
  }

  if (wooSlice.length === 0) return null;

  return (
    <HomeProductRail
      title={t("favorite_section_title")}
      subtitle={t("favorite_section_sub")}
      seeAllHref="/accessories"
    >
      {wooSlice.map((p) => (
        <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
      ))}
    </HomeProductRail>
  );
}
