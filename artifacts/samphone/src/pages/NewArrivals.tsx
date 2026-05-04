import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
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
    <div className="bg-background">
      <section className="bg-background border-b border-border">
        <NewArrivalsHeader />
      </section>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="flex items-center gap-3 mb-8 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <Clock className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            We add new products every week. Never miss a drop.
          </p>
        </div>

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
            className="grid list-none grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 p-0"
          >
            {list.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div ref={ref} variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {NEW_ARRIVALS_PRODUCTS.map((p) => {
              const { daysAgo, ...card } = p;
              return (
                <motion.div key={p.cartKey} variants={itemVariants} className="relative">
                  <div className="absolute top-2 right-2 z-30 text-xs bg-background/80 backdrop-blur text-foreground/70 px-2 py-0.5 rounded-full pointer-events-none">
                    {daysAgo === 1 ? "Today" : `${daysAgo}d ago`}
                  </div>
                  <ProductCard {...card} testPrefix="new" buttonColor="bg-emerald-600 hover:bg-emerald-700 text-white" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
