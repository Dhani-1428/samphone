import { useMemo } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import ProductCard from "@/components/ProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { HOME_PRODUCTS } from "@/data/catalog";
import { pickHomeFeatured, sortNewest } from "@/lib/woo-product-filters";

export default function Products() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();

  const featured = useMemo(() => {
    if (!woo) return [];
    const excludeNewArrivals = new Set(sortNewest(products).slice(0, 14).map((p) => p.id));
    return pickHomeFeatured(products, 14, 0, excludeNewArrivals);
  }, [woo, products]);

  if (woo && loading && featured.length === 0) {
    return (
      <div id="products">
        <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
          <CatalogLoading compact />
        </HomeProductRail>
      </div>
    );
  }

  const cards =
    woo && featured.length > 0
      ? featured.map((p) => (
          <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
        ))
      : HOME_PRODUCTS.map((product) => <ProductCard key={product.id} {...product} testPrefix="home" />);

  return (
    <div id="products">
      <HomeProductRail title={t("featured_section_title")} seeAllHref="/accessories">
        {cards}
      </HomeProductRail>
    </div>
  );
}
