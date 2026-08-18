import { useMemo } from "react";
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
  const { products } = useProductCatalog();

  // Prefer products outside New Arrivals + Products windows; still fill if catalog is small.
  const wooSlice = useMemo(() => {
    if (!(woo && products.length > 0)) return [];
    const sorted = sortNewest(products);
    const excludeIds = new Set(sorted.slice(0, 22).map((p) => p.id));
    return pickHomeFeatured(products, 8, 0, excludeIds);
  }, [woo, products]);
  const mockSlice = recommendedProducts.slice(0, 8);
  if (woo && wooSlice.length === 0) return null;
  if (!woo && mockSlice.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-navy md:text-[2rem]">{t("recommended_title")}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
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
