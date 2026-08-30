import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { groupIcon } from "@/components/AccessoryFilterChip";
import { useLang } from "@/contexts/LanguageContext";
import {
  ACCESSORY_NAV_PAGES,
  accessoryPageHref,
  shopGroupFetchQueries,
  type AccessoryNavPage,
} from "@/data/accessory-pages";
import { fetchCloudProductList, firstCatalogImage } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

type TileData = { img: string | null; count: number };

const GROUP_ICON_BG: Record<string, string> = {
  Powerbanks: "bg-[#F2B33F]",
  Chargers: "bg-[#14B8A6]",
  Cables: "bg-[#38BDF8]",
  Headphones: "bg-[#A78BFA]",
  Speakers: "bg-[#F43F5E]",
  Smartwatch: "bg-[#818CF8]",
  "Mobile Car Support": "bg-[#38BDF8]",
  Laptop: "bg-[#FB7185]",
  "Audio & Microphone": "bg-[#2DD4BF]",
  Electronics: "bg-[#FB923C]",
  Beautycare: "bg-[#FB7185]",
  "Cell AA/AAA": "bg-[#F59E0B]",
  "Original Accessories": "bg-[#60A5FA]",
  Cards: "bg-[#EC4899]",
  "Repairing Tools": "bg-[#EAB308]",
};

function tileImage(products: WooProduct[]): string | null {
  const usable = products.filter((p) => {
    const name = (p.name ?? "").toLowerCase();
    return !name.includes("available in stock") && !name.includes("coming soon");
  });
  return firstCatalogImage(usable.length ? usable : products);
}

async function loadTile(page: AccessoryNavPage): Promise<TileData> {
  let best: TileData = { img: null, count: 0 };
  for (const query of shopGroupFetchQueries(page.group)) {
    try {
      const data = await fetchCloudProductList(query, 12);
      const img = tileImage(data.items);
      if (data.total > best.count) best = { img: img ?? best.img, count: data.total };
      else if (img && !best.img) best = { ...best, img };
      if (best.img && best.count > 0) return best;
    } catch {
      /* try next query */
    }
  }
  return best;
}

export default function Categories({
  showHeading = true,
}: {
  showHeading?: boolean;
  cardStyle?: "overlay" | "catalog";
  embedded?: boolean;
}) {
  const { t } = useLang();
  const [tiles, setTiles] = useState<Record<string, TileData>>({});

  useEffect(() => {
    let alive = true;
    void Promise.all(
      ACCESSORY_NAV_PAGES.map(async (page) => {
        const data = await loadTile(page);
        if (alive) setTiles((prev) => ({ ...prev, [page.group]: data }));
      }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="categories" className="bg-white py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? (
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-[2.35rem] font-extrabold leading-none tracking-tight text-brand md:text-[2.85rem]">
              {t("home_accessories_title")}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] font-medium text-neutral-500">
              {t("home_accessories_sub")}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8 lg:gap-y-14">
          {ACCESSORY_NAV_PAGES.map((page, i) => {
            const data = tiles[page.group];
            const countLabel =
              data && data.count > 0 ? `${data.count} ${t("home_accessories_items")}` : "\u00a0";
            const Icon = groupIcon(page.group);
            const iconBg = GROUP_ICON_BG[page.group] ?? "bg-brand";
            return (
              <Link
                key={page.group}
                href={accessoryPageHref(page.group)}
                className="group flex flex-col items-center text-center"
                data-testid={`card-category-${i}`}
              >
                <span className="flex h-[8.5rem] w-[8.5rem] items-center justify-center overflow-hidden rounded-full bg-[#F3F4F6] sm:h-[9.5rem] sm:w-[9.5rem] lg:h-[10.25rem] lg:w-[10.25rem]">
                  {data?.img ? (
                    <CatalogImage
                      src={data.img}
                      alt={page.label}
                      className="h-[78%] w-[78%] object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="h-[52%] w-[52%] animate-pulse rounded-full bg-neutral-200" />
                  )}
                </span>
                <span className={`mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white ${iconBg}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <h3 className="mt-2.5 text-[17px] font-extrabold leading-tight text-[#111111] sm:text-[18px]">
                  {page.label}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-neutral-500">{countLabel}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-[#2563EB]">
                  {t("home_accessories_shop")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
