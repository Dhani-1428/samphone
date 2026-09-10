import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import CatalogLoading from "@/components/CatalogLoading";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { pricingAudience } from "@/lib/customer-price";
import { sortNewest } from "@/lib/woo-product-filters";
import { fetchCloudNewArrivals } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } } };

function NewArrivalsHeader() {
  const { t } = useLang();
  return (
    <PageVideoHero
      eyebrow={t("newArrivals_section_title")}
      title={t("newArrivals_section_title")}
      description={t("newArrivals_section_sub")}
    />
  );
}

export default function NewArrivals() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { t } = useLang();
  const { user } = useAuth();
  const audience = pricingAudience(user);
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [cloudItems, setCloudItems] = useState<WooProduct[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setCloudLoading(true);
    void fetchCloudNewArrivals(50)
      .then((items) => {
        if (alive) setCloudItems(items);
      })
      .catch(() => {
        if (alive) setCloudItems(null);
      })
      .finally(() => {
        if (alive) setCloudLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [audience]);

  const catalogNewest = useMemo(() => (woo ? sortNewest(products) : []), [woo, products]);

  const list = useMemo(() => {
    if (cloudItems && cloudItems.length > 0) return cloudItems;
    return catalogNewest.slice(0, 50);
  }, [cloudItems, catalogNewest]);

  const busy = (cloudLoading && list.length === 0) || (woo && loading && list.length === 0);

  const grid = (
    <>
      {busy ? <CatalogLoading /> : null}

      {woo && !busy && error && list.length === 0 ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : null}

      {!busy && list.length === 0 && woo ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
      ) : null}

      {!busy && list.length > 0 ? (
        <motion.ul
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="catalog-product-grid"
        >
          {list.map((p) => (
            <motion.li key={p.id} variants={itemVariants}>
              <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
            </motion.li>
          ))}
        </motion.ul>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <NewArrivalsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        {grid}
      </div>
    </div>
  );
}
