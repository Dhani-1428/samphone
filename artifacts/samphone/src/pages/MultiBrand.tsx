import { useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Award, TrendingUp, Star, Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { MULTI_BRAND_FEATURED } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterMultiBrandCatalog } from "@/lib/woo-product-filters";

const brandCards = [
  { name: "Hoco", logo: "H", color: "from-amber-500 to-orange-600", items: 120 },
  { name: "Baseus", logo: "B", color: "from-blue-500 to-indigo-600", items: 95 },
  { name: "Anker", logo: "A", color: "from-green-500 to-emerald-600", items: 78 },
  { name: "Ugreen", logo: "U", color: "from-slate-500 to-slate-700", items: 64 },
  { name: "Joyroom", logo: "J", color: "from-purple-500 to-violet-600", items: 55 },
  { name: "WK Design", logo: "W", color: "from-rose-500 to-pink-600", items: 48 },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.09 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function MultiBrandHeader() {
  return (
    <PageVideoHero
      eyebrow="Premium Brands Collection"
      title="Multi Brand Store"
      description="Top international brands, all in one place."
    />
  );
}

export default function MultiBrand() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const visibleWoo = useMemo(
    () => filterMultiBrandCatalog(products, selectedBrand, 48),
    [products, selectedBrand],
  );
  const visibleMock = MULTI_BRAND_FEATURED.filter((p) => !selectedBrand || p.brand === selectedBrand);

  return (
    <div className="bg-background">
      <section className="bg-background border-b border-border">
        <MultiBrandHeader />
      </section>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[{ icon: Award, value: "20+", label: "Premium Brands" }, { icon: TrendingUp, value: "500+", label: "Brand Products" }, { icon: Star, value: "4.8/5", label: "Average Rating" }].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-foreground">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <h2 className="text-xl font-display font-bold text-foreground mb-5">Shop by Brand</h2>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {brandCards.map((b) => (
            <motion.button
              key={b.name}
              type="button"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedBrand(selectedBrand === b.name ? null : b.name)}
              className={`rounded-2xl p-4 border-2 transition-all text-left ${selectedBrand === b.name ? "border-primary shadow-lg" : "border-border hover:border-primary/50"}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center text-white font-display font-bold text-xl mb-3`}>{b.logo}</div>
              <p className="font-display font-bold text-foreground text-sm">{b.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{b.items} items</p>
            </motion.button>
          ))}
        </motion.div>

        <h2 className="text-xl font-display font-bold text-foreground mb-5">
          {selectedBrand ? `${selectedBrand} Products` : "Featured Products"}
        </h2>

        {woo && loading && visibleWoo.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          </div>
        )}

        {woo && !loading && error && <p className="text-sm text-destructive py-8">{error}</p>}

        {woo && !loading && !error && visibleWoo.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">{selectedBrand ? `No products matched ${selectedBrand} yet.` : t("woo_empty")}</p>
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

        {!woo && selectedBrand && visibleMock.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No featured products for {selectedBrand} yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
