import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { groupIcon } from "@/components/AccessoryFilterChip";
import { useLang } from "@/contexts/LanguageContext";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { fetchCloudProductList, firstCatalogImage } from "@/lib/samphone-cloud";

type TileData = { img: string | null; count: number };

const GROUP_ICON_BG: Record<string, string> = {
  Powerbanks: "bg-[#F2B33F]",
  Chargers: "bg-[#22C55E]",
  Cables: "bg-[#22D3EE]",
  Headphones: "bg-[#A78BFA]",
  Speakers: "bg-[#F472B6]",
  Smartwatch: "bg-[#818CF8]",
  "Mobile Car Support": "bg-[#38BDF8]",
  Laptop: "bg-[#FB7185]",
  "Audio & Microphone": "bg-[#34D399]",
  Electronics: "bg-[#FB923C]",
  Beautycare: "bg-[#F43F5E]",
  "Cell AA/AAA": "bg-[#F2B33F]",
  "Original Accessories": "bg-[#60A5FA]",
  Cards: "bg-[#F97316]",
  "Repairing Tools": "bg-[#EAB308]",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function AccessoriesHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-8 text-left md:mb-10">
      <h2 className="nav-bar-item relative inline-block pb-2.5 text-[2rem] leading-none text-black md:text-[2.35rem]">
        {title}
        <span className="absolute bottom-0 left-0 h-[5px] w-[3.4rem] rounded-sm bg-sam" aria-hidden />
      </h2>
      <p className="mt-3 max-w-xl text-sm font-semibold text-neutral-500">{sub}</p>
    </div>
  );
}

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
      className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    >
      {ACCESSORY_NAV_PAGES.map((page, i) => {
        const data = tiles[page.group];
        const countLabel = data && data.count > 0 ? `${data.count} ${t("home_accessories_items")}` : "\u00a0";
        const Icon = groupIcon(page.group);
        const iconBg = GROUP_ICON_BG[page.group] ?? "bg-black";
        return (
          <motion.div key={page.group} variants={cardVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Link
              href={accessoryPageHref(page.group)}
              className="group flex items-center gap-4"
              data-testid={`card-category-${i}`}
            >
              <span className="flex h-[7.25rem] w-[7.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0F2F5] sm:h-[7.75rem] sm:w-[7.75rem]">
                {data?.img ? (
                  <CatalogImage
                    src={data.img}
                    alt={page.label}
                    className="h-[78%] w-[78%] object-contain transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-[55%] w-[55%] animate-pulse rounded-full bg-neutral-200" />
                )}
              </span>
              <span className="min-w-0">
                <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-white ${iconBg}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <h3 className="nav-bar-item text-[16px] leading-tight text-black sm:text-[17px]">{page.label}</h3>
                <p className="mt-1 text-[13px] font-semibold text-neutral-500">{countLabel}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#2B5CB8]">
                  {t("home_accessories_shop")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
              </span>
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
          <AccessoriesHeading title={t("home_accessories_title")} sub={t("home_accessories_sub")} />
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
          >
            <AccessoriesHeading title={t("home_accessories_title")} sub={t("home_accessories_sub")} />
          </motion.div>
        ) : (
          <div ref={ref} />
        )}
        {grid}
      </div>
    </section>
  );
}
