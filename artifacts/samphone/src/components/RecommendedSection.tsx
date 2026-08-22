import { useMemo } from "react";
import HomeProductRail from "@/components/HomeProductRail";
import { useLang } from "@/contexts/LanguageContext";
import { useBrowseBehavior } from "@/contexts/BrowseBehaviorContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import { pickHomeFeatured, sortNewest } from "@/lib/woo-product-filters";

export default function RecommendedSection() {
  const { t } = useLang();
  const { recommendedProducts } = useBrowseBehavior();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();

  const wooSlice = useMemo(() => {
    if (!(woo && products.length > 0)) return [];
    const sorted = sortNewest(products);
    const excludeIds = new Set(sorted.slice(0, 22).map((p) => p.id));
    return pickHomeFeatured(products, 14, 0, excludeIds);
  }, [woo, products]);
  const mockSlice = recommendedProducts.slice(0, 14);

  const cards =
    woo && wooSlice.length > 0
      ? wooSlice.map((p) => (
          <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
        ))
      : woo && loading
        ? [
            <div
              key="loading"
              className="flex h-64 items-center justify-center rounded-xl bg-card text-sm text-muted-foreground"
            >
              {t("woo_loading")}
            </div>,
          ]
        : mockSlice.map((p) => <ProductCard key={p.cartKey} {...p} testPrefix="rec" />);

  if (woo && !loading && wooSlice.length === 0) return null;
  if (!woo && mockSlice.length === 0) return null;

  return (
    <HomeProductRail
      title={t("favorite_section_title")}
      subtitle={t("favorite_section_sub")}
      seeAllHref="/wishlist"
    >
      {cards}
    </HomeProductRail>
  );
}
