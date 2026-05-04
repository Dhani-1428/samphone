import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import smartphoneAppleVideo from "@/assets/smartphone-apple.mp4";
import { PHONE_PARTS } from "@/data/catalog";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { filterSmartphoneBrand } from "@/lib/woo-product-filters";

const brands = [
  { name: "iPhone Parts", img: productScreen, count: "180+ parts", color: "from-gray-700 to-gray-900" },
  { name: "Samsung Parts", img: productCase, count: "220+ parts", color: "from-blue-700 to-blue-900" },
  { name: "Xiaomi Parts", img: productCharger, count: "140+ parts", color: "from-orange-600 to-red-700" },
  { name: "Oppo Reno Parts", img: productScreen, count: "90+ parts", color: "from-green-700 to-emerald-900" },
  { name: "Realme Parts", img: productCase, count: "80+ parts", color: "from-yellow-600 to-orange-700" },
  { name: "Huawei Parts", img: productCharger, count: "110+ parts", color: "from-red-700 to-rose-900" },
  { name: "One Plus Parts", img: productScreen, count: "70+ parts", color: "from-red-600 to-red-900" },
  { name: "Motorola Parts", img: productCase, count: "60+ parts", color: "from-indigo-700 to-indigo-900" },
  { name: "Alcatel Parts", img: productCharger, count: "40+ parts", color: "from-teal-700 to-teal-900" },
  { name: "Google Pixel Parts", img: productScreen, count: "55+ parts", color: "from-blue-600 to-cyan-700" },
  { name: "Nokia Parts", img: productCase, count: "45+ parts", color: "from-sky-700 to-sky-900" },
  { name: "Repair Tools", img: productCharger, count: "30+ items", color: "from-slate-600 to-slate-800" },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function SmartphonesHeader() {
  return (
    <PageVideoHero
      videoSrc={smartphoneAppleVideo}
      eyebrow="Home / Smartphones"
      title="Smartphone Parts"
      description="Genuine-quality replacement parts for 700+ device models."
    />
  );
}

export default function Smartphones() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [selected, setSelected] = useState<string | null>(null);

  const wooList = useMemo(
    () => (woo ? filterSmartphoneBrand(products, selected, 24) : []),
    [woo, products, selected],
  );

  return (
    <div className="bg-background">
      <section className="border-b border-border">
        <SmartphonesHeader />
      </section>

      <div className="bg-muted/30 py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Select Your Brand</h2>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search brand..."
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {brands.map((b) => (
              <motion.button
                key={b.name}
                type="button"
                variants={itemVariants}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(selected === b.name ? null : b.name)}
                className={`rounded-2xl overflow-hidden border-2 transition-all ${selected === b.name ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"}`}
              >
                <div className={`relative aspect-square bg-gradient-to-br ${b.color} flex items-center justify-center overflow-hidden`}>
                  <img src={b.img} alt={b.name} className="w-full h-full object-cover opacity-30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <span className="text-white font-display font-bold text-xs md:text-sm text-center leading-tight">{b.name}</span>
                    <span className="text-white/70 text-xs mt-1">{b.count}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          {selected ? `${selected} — Available Parts` : "Featured Parts"}
        </h2>

        {woo && loading && wooList.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {woo && !loading && error && <p className="text-sm text-destructive py-8">{error}</p>}

        {woo && !loading && !error && wooList.length === 0 && (
          <p className="text-sm text-muted-foreground py-16">{t("woo_empty")}</p>
        )}

        {woo && wooList.length > 0 && (
          <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="grid list-none grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 p-0">
            {wooList.map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!woo && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {PHONE_PARTS.map((p) => (
              <motion.div key={p.cartKey} variants={itemVariants}>
                <ProductCard {...p} testPrefix="phone" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
