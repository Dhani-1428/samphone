import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { HOME_PRODUCTS } from "@/data/catalog";
import { pickHomeFeatured } from "@/lib/woo-product-filters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

export default function Products() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();

  // Use a different catalog window than Home New Arrivals to avoid repeated cards.
  const featured = useMemo(() => (woo ? pickHomeFeatured(products, 8, 14) : []), [woo, products]);

  return (
    <section id="products" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {t("popularProducts")}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t("products_title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t("products_sub")}
          </p>
        </motion.div>

        {woo && loading && featured.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {woo && !loading && error && (
          <p className="text-center text-sm text-destructive py-8">{error}</p>
        )}

        {woo && !loading && !error && featured.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">{t("woo_empty")}</p>
        )}

        {woo && featured.length > 0 && (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid list-none grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 xl:gap-5 p-0"
          >
            {featured.map((p) => (
              <motion.li key={p.id} variants={cardVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 xl:gap-5"
          >
            {HOME_PRODUCTS.map((product) => (
              <motion.div key={product.id} variants={cardVariants}>
                <ProductCard {...product} testPrefix="home" />
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Button
            size="lg"
            variant="outline"
            className="px-10 border-border hover:bg-muted"
            onClick={() => (window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/accessories`)}
          >
            {t("viewAll")}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
