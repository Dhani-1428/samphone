import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import { MULTI_BRAND_FEATURED } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterMultiBrandCatalog } from "@/lib/woo-product-filters";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.09 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function MultiBrand() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();

  const visibleWoo = useMemo(() => filterMultiBrandCatalog(products, null, 48), [products]);
  const visibleMock = MULTI_BRAND_FEATURED;

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h1 className="mb-5 font-display text-xl font-bold text-navy">Featured Products</h1>

        {woo && loading && visibleWoo.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          </div>
        )}

        {woo && !loading && error && <p className="text-sm text-destructive py-8">{error}</p>}

        {woo && !loading && !error && visibleWoo.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">{t("woo_empty")}</p>
          </div>
        )}

        {woo && visibleWoo.length > 0 && (
          <motion.ul
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid list-none grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 p-0"
          >
            {visibleWoo.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5"
          >
            {visibleMock.map((p) => (
              <motion.div key={p.cartKey} variants={itemVariants}>
                <ProductCard {...p} testPrefix="multi" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
