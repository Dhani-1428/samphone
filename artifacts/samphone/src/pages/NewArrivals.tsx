import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import CatalogLoading from "@/components/CatalogLoading";
import CatalogListFilters, {
  applyCatalogListFilters,
  catalogListFilterCount,
  CatalogFilterLayout,
  EMPTY_CATALOG_LIST_FILTERS,
  type CatalogListFilterState,
} from "@/components/CatalogListFilters";
import { NEW_ARRIVALS_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
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
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [cloudItems, setCloudItems] = useState<WooProduct[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [filters, setFilters] = useState<CatalogListFilterState>({
    ...EMPTY_CATALOG_LIST_FILTERS,
    sort: "newest",
  });

  useEffect(() => {
    let alive = true;
    setCloudLoading(true);
    void fetchCloudNewArrivals(120)
      .then((items) => {
        if (alive) setCloudItems(items);
      })
      .catch(() => {
        if (alive) setCloudItems([]);
      })
      .finally(() => {
        if (alive) setCloudLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const catalogNewest = useMemo(() => (woo ? sortNewest(products) : []), [woo, products]);

  const rawList = useMemo(() => {
    if (cloudItems && cloudItems.length > 0) return cloudItems;
    return catalogNewest;
  }, [cloudItems, catalogNewest]);

  const list = useMemo(() => applyCatalogListFilters(rawList, filters), [rawList, filters]);

  const busy = (cloudLoading && rawList.length === 0) || (woo && loading && rawList.length === 0);
  const showFilters = !busy && rawList.length > 0;

  const grid = (
    <>
      {busy ? <CatalogLoading /> : null}

      {woo && !busy && error && rawList.length === 0 ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : null}

      {!busy && rawList.length === 0 && woo ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
      ) : null}

      {!busy && rawList.length > 0 && list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No products match your filters.</p>
      ) : null}

      {list.length > 0 ? (
        <motion.ul
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-4 xl:grid-cols-5"
        >
          {list.map((p) => (
            <motion.li key={p.id} variants={itemVariants}>
              <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
            </motion.li>
          ))}
        </motion.ul>
      ) : null}

      {!woo && !busy && rawList.length === 0 ? (
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6"
        >
          {NEW_ARRIVALS_PRODUCTS.map((p) => {
            const { daysAgo: _daysAgo, ...card } = p;
            return (
              <motion.div key={p.cartKey} variants={itemVariants}>
                <ProductCard {...card} testPrefix="new" />
              </motion.div>
            );
          })}
        </motion.div>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <NewArrivalsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        {showFilters ? (
          <CatalogFilterLayout
            activeCount={catalogListFilterCount(filters)}
            sidebar={
              <CatalogListFilters
                filters={filters}
                onChange={setFilters}
                resultCount={list.length}
                searchPlaceholder="Search new arrivals…"
              />
            }
          >
            {grid}
          </CatalogFilterLayout>
        ) : (
          grid
        )}
      </div>
    </div>
  );
}
