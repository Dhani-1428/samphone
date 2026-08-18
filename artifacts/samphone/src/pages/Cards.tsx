import { useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { CARDS_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterCardsCatalog } from "@/lib/woo-product-filters";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function CardsHeader() {
  return (
    <PageVideoHero
      eyebrow="Home / Cards"
      title="Memory & SIM Cards"
      description="Expand your storage. Keep your connections."
    />
  );
}

export default function Cards() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const list = useMemo(() => (woo ? filterCardsCatalog(products) : []), [woo, products]);

  return (
    <div>
      <CardsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h2 className="mb-6 font-display text-2xl font-bold text-navy">All Memory Cards</h2>

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
          <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="grid list-none grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 p-0">
            {list.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {CARDS_PRODUCTS.map((p) => (
              <motion.div key={p.cartKey} variants={itemVariants}>
                <ProductCard {...p} testPrefix="card" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
