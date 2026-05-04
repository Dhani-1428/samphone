import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, HardDrive, CreditCard, Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { CARDS_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterCardsCatalog } from "@/lib/woo-product-filters";

const cardTypes = [
  { icon: HardDrive, label: "MicroSD Cards", desc: "For phones, tablets, drones & cameras", color: "bg-blue-500/10 text-blue-600" },
  { icon: HardDrive, label: "SD Cards", desc: "Standard SD for cameras and devices", color: "bg-indigo-500/10 text-indigo-600" },
  { icon: CreditCard, label: "SIM Adapters", desc: "Nano, Micro, and Standard SIM adapters", color: "bg-emerald-500/10 text-emerald-600" },
  { icon: Zap, label: "High-Speed UHS", desc: "Ultra High Speed cards for professionals", color: "bg-amber-500/10 text-amber-600" },
];

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
    <div className="bg-background">
      <section className="bg-background border-b border-border">
        <CardsHeader />
      </section>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {cardTypes.map((ct) => (
            <motion.div
              key={ct.label}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="p-5 bg-card border border-border rounded-2xl cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${ct.color}`}>
                <ct.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-foreground text-sm mb-1">{ct.label}</h3>
              <p className="text-muted-foreground text-xs">{ct.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-10 flex flex-col md:flex-row items-center gap-4"
        >
          <Zap className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h3 className="font-display font-bold text-foreground mb-1">How to choose the right speed class?</h3>
            <p className="text-muted-foreground text-sm">
              Class 10 / UHS-I for everyday use. UHS-II for 4K video and professional photography. Chat with us on WhatsApp for help.
            </p>
          </div>
        </motion.div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-6">All Memory Cards</h2>

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
          <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="grid list-none grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 p-0">
            {list.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
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
