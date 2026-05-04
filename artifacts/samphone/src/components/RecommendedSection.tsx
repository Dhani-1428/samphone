import { useMemo } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { useBrowseBehavior } from "@/contexts/BrowseBehaviorContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import { pickHomeFeatured } from "@/lib/woo-product-filters";

export default function RecommendedSection() {
  const { t } = useLang();
  const { recommendedProducts } = useBrowseBehavior();
  const woo = hasWooCommerceConfig();
  const { products } = useProductCatalog();

  const wooSlice = useMemo(() => (woo && products.length > 0 ? pickHomeFeatured(products, 8) : []), [woo, products]);
  const mockSlice = recommendedProducts.slice(0, 8);
  if (woo && wooSlice.length === 0) return null;
  if (!woo && mockSlice.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">{t("recommended_title")}</h2>
          <p className="text-muted-foreground">{t("recommended_sub")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {woo
            ? wooSlice.map((p) => (
                <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
              ))
            : mockSlice.map((p) => <ProductCard key={p.cartKey} {...p} testPrefix="rec" />)}
        </div>
      </div>
    </section>
  );
}
