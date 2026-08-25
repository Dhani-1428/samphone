import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { useLang } from "@/contexts/LanguageContext";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { fetchCloudProductList, firstCatalogImage } from "@/lib/samphone-cloud";

type TileData = { img: string | null; count: number };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Categories({
  showHeading = true,
  cardStyle = "overlay",
  embedded = false,
}: {
  showHeading?: boolean;
  cardStyle?: "overlay" | "catalog";
  embedded?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLang();
  const [tiles, setTiles] = useState<Record<string, TileData>>({});

  useEffect(() => {
    let alive = true;
    void Promise.all(
      ACCESSORY_NAV_PAGES.map(async (page) => {
        try {
          const data = await fetchCloudProductList({ category_group: page.group }, 8);
          if (alive) {
            setTiles((prev) => ({
              ...prev,
              [page.group]: { img: firstCatalogImage(data.items), count: data.total },
            }));
          }
        } catch {
          if (alive) setTiles((prev) => ({ ...prev, [page.group]: { img: null, count: 0 } }));
        }
      }),
    );
    return () => {
      alive = false;
    };
  }, []);

  const grid = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {ACCESSORY_NAV_PAGES.map((page, i) => {
        const data = tiles[page.group];
        const countLabel = data && data.count > 0 ? `${data.count} ${t("home_accessories_items")}` : "\u00a0";
        return (
          <motion.div key={page.group} variants={cardVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Link
              href={accessoryPageHref(page.group)}
              className={
                cardStyle === "catalog"
                  ? "group block overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm"
                  : "group relative block cursor-pointer overflow-hidden rounded-2xl border border-border bg-card"
              }
              data-testid={`card-category-${i}`}
            >
              <div
                className={
                  cardStyle === "catalog"
                    ? "aspect-[4/3] overflow-hidden bg-[#F7F9FC]"
                    : "aspect-[4/3] overflow-hidden bg-white dark:bg-neutral-900"
                }
              >
                {data?.img ? (
                  <CatalogImage
                    src={data.img}
                    alt={page.label}
                    className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full animate-pulse bg-muted" />
                )}
                {cardStyle === "overlay" ? (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                ) : null}
              </div>
              {cardStyle === "catalog" ? (
                <div className="border-t border-black/[0.06] px-3 py-3">
                  <h3 className="font-display text-sm font-bold leading-tight text-navy md:text-base">{page.label}</h3>
                  <p className="mt-0.5 text-[12px] text-[#8A97AB]">{countLabel}</p>
                </div>
              ) : (
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <p className="mb-0.5 text-[11px] text-white/70">{countLabel}</p>
                  <h3 className="font-display text-sm font-bold leading-tight text-white md:text-base">{page.label}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {t("home_accessories_shop")} <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );

  if (embedded) {
    return (
      <div id="categories" ref={ref}>
        {showHeading ? (
          <div className="mb-6 text-left">
            <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
              {t("home_accessories_title")}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">{t("home_accessories_sub")}</p>
          </div>
        ) : null}
        {grid}
      </div>
    );
  }

  return (
    <section id="categories" className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            ref={ref}
            transition={{ duration: 0.6 }}
            className="mb-6 text-left"
          >
            <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
              {t("home_accessories_title")}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">{t("home_accessories_sub")}</p>
          </motion.div>
        ) : (
          <div ref={ref} />
        )}
        {grid}
      </div>
    </section>
  );
}
