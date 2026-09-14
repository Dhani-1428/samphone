import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import CatalogLoading from "@/components/CatalogLoading";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { pricingAudience } from "@/lib/customer-price";
import { sortNewest } from "@/lib/woo-product-filters";
import { fetchCloudNewArrivals } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

const NEW_ARRIVAL_COUNT = 100;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } };
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
  const [items, setItems] = useState<WooProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError(null);
    void fetchCloudNewArrivals(NEW_ARRIVAL_COUNT)
      .then((rows) => {
        if (!alive) return;
        setItems(sortNewest(rows).slice(0, NEW_ARRIVAL_COUNT));
      })
      .catch((e) => {
        if (!alive) return;
        setItems([]);
        setError(e instanceof Error ? e.message : t("woo_empty"));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [audience, t]);

  const list = useMemo(() => sortNewest(items).slice(0, NEW_ARRIVAL_COUNT), [items]);

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <NewArrivalsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        {busy && list.length === 0 ? <CatalogLoading /> : null}

        {!busy && error && list.length === 0 ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : null}

        {!busy && list.length === 0 && !error ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
        ) : null}

        {list.length > 0 ? (
          <motion.ul
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView || !busy ? "visible" : "hidden"}
            className="catalog-product-grid"
          >
            {list.map((p) => (
              <motion.li key={p.cloudId || p.id} variants={itemVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </div>
    </div>
  );
}
