import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { NEW_ARRIVALS_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { sortNewest } from "@/lib/woo-product-filters";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } } };

function NewArrivalsHeader() {
  return (
    <PageVideoHero
      eyebrow="Just Arrived"
      title="New Arrivals"
      description="The freshest stock - newly added this week."
    />
  );
}

export default function NewArrivals() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const list = useMemo(() => (woo ? sortNewest(products).slice(0, 24) : []), [woo, products]);

  return (
    <div>
      <NewArrivalsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">

        {woo && loading && list.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          </div>
        )}

        {woo && !loading && error && <p className="text-center text-sm text-destructive py-8">{error}</p>}

        {woo && !loading && !error && list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">{t("woo_empty")}</p>
        )}

        {woo && list.length > 0 && (
          <motion.ul
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid list-none grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 p-0"
          >
            {list.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div ref={ref} variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {NEW_ARRIVALS_PRODUCTS.map((p) => {
              const { daysAgo: _daysAgo, ...card } = p;
              return (
                <motion.div key={p.cartKey} variants={itemVariants}>
                  <ProductCard {...card} testPrefix="new" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
