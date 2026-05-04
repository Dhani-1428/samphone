import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { ACCESSORIES_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import {
  filterAccessoryCatalog,
  filterAccessoryChip,
  sortByPrice,
} from "@/lib/woo-product-filters";

const categories = ["All", "Screen Protection", "Cases & Covers", "Chargers", "Cables", "Audio", "Smartwatches", "Hoco Accessories"];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function AccessoriesHeader() {
  return (
    <PageVideoHero
      eyebrow="Home / Accessories"
      title="Accessories"
      description="Premium accessories for every device and lifestyle."
    />
  );
}

export default function Accessories() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Popular");

  const wooPool = useMemo(() => filterAccessoryCatalog(products), [products]);

  const filteredWoo = useMemo(() => {
    let list = filterAccessoryChip(wooPool, activeCategory);
    if (sortBy === "Price: Low to High") list = sortByPrice(list, "asc");
    else if (sortBy === "Price: High to Low") list = sortByPrice(list, "desc");
    else if (sortBy === "Newest") list = [...list].sort((a, b) => b.id - a.id);
    return list;
  }, [wooPool, activeCategory, sortBy]);

  const filteredMock =
    activeCategory === "All"
      ? ACCESSORIES_PRODUCTS
      : ACCESSORIES_PRODUCTS.filter((p) => p.subtitle === activeCategory);

  return (
    <div className="bg-background">
      <section className="bg-background border-b border-border">
        <AccessoriesHeader />
      </section>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary hover:text-primary"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {woo ? `${filteredWoo.length} products` : `${filteredMock.length} products found`}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 border-border">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer"
              >
                <option>Popular</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>
          </div>
        </div>

        {woo && loading && filteredWoo.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {woo && !loading && error && <p className="text-center text-sm text-destructive py-12">{error}</p>}

        {woo && !loading && !error && filteredWoo.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">{t("woo_empty")}</p>
        )}

        {woo && filteredWoo.length > 0 && (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid list-none grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 p-0"
          >
            {filteredWoo.map((p) => (
              <motion.li key={p.id} variants={cardVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filteredMock.map((p) => (
              <motion.div key={p.cartKey} variants={cardVariants}>
                <ProductCard {...p} testPrefix="acc" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
