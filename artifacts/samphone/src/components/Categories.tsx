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
import accessoriesProducts from "@/assets/mobile-accessories-products.png";
import { cn } from "@/lib/utils";

/** Section palette from the Mobile Accessories mockup. */
const ACC_BLUE = "#1E4FD6";
const ACC_YELLOW = "#F5C518";

type TileData = { img: string | null; count: number };

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

function AccessoriesHeroBanner() {
  const { t } = useLang();

  return (
    <Link
      href="/accessories"
      className="group relative mb-5 block overflow-hidden rounded-[1.25rem] md:mb-6 md:rounded-[1.5rem]"
      aria-label={t("home_accessories_title")}
    >
      <div
        className="relative flex min-h-[9.75rem] items-stretch overflow-hidden sm:min-h-[11.5rem] md:min-h-[13.75rem] lg:min-h-[15.5rem]"
        style={{ backgroundColor: ACC_BLUE }}
      >
        {/* Soft circle accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full opacity-30"
          style={{ backgroundColor: "#163DB0" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[46%] sm:w-[44%] md:w-[42%]"
          style={{
            backgroundColor: ACC_YELLOW,
            borderTopLeftRadius: "58% 100%",
            borderBottomLeftRadius: "72% 100%",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full opacity-40"
          style={{ backgroundColor: "#FFD24A" }}
        />

        <div className="relative z-10 grid w-full grid-cols-[1.15fr_1fr] items-center sm:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col justify-center px-5 py-6 sm:px-7 sm:py-8 md:px-10 md:py-10 lg:px-12">
            <span
              className="mb-3 block h-[3px] w-10 rounded-full sm:mb-4 sm:w-12"
              style={{ backgroundColor: ACC_YELLOW }}
              aria-hidden
            />
            <h2 className="font-display text-[1.5rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[1.95rem] md:text-[2.4rem] lg:text-[2.75rem]">
              {t("home_accessories_title_mobile")}{" "}
              <span style={{ color: ACC_YELLOW }}>{t("home_accessories_title_accessories")}</span>
            </h2>
            <p className="mt-2 max-w-[22rem] text-[12px] font-medium leading-snug text-white/90 sm:mt-3 sm:text-[14px] md:text-[15px]">
              {t("home_accessories_sub")}
            </p>
          </div>

          <div className="relative flex h-full min-h-[9.75rem] items-center justify-center self-stretch pr-1 sm:min-h-[11.5rem] sm:pr-3 md:min-h-[13.75rem] md:pr-5 lg:min-h-[15.5rem]">
            <img
              src={accessoriesProducts}
              alt=""
              className="max-h-[94%] w-auto max-w-[108%] object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-[1.04]"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function AccessoryCategoryTile({
  page,
  index,
  img,
}: {
  page: AccessoryNavPage;
  index: number;
  img: string | null;
}) {
  const Icon = groupIcon(page.group);
  const isBlue = index % 2 === 0;
  const bg = isBlue ? ACC_BLUE : ACC_YELLOW;

  return (
    <Link
      href={accessoryPageHref(page.group)}
      className="group flex flex-col overflow-hidden rounded-[1.15rem] transition-transform duration-300 hover:-translate-y-1"
      style={{ backgroundColor: bg }}
      data-testid={`card-category-${index}`}
    >
      <span className="relative flex aspect-[1/1.05] items-center justify-center px-4 pb-2 pt-5 sm:px-5 sm:pt-6">
        {img ? (
          <CatalogImage
            src={img}
            alt={page.label}
            className="h-full w-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              isBlue ? "bg-white/15 text-white" : "bg-black/10 text-[#1a1a1a]",
            )}
          >
            <Icon className="h-8 w-8" strokeWidth={1.7} />
          </span>
        )}
      </span>

      <span className="mt-auto px-3 pb-3.5 sm:px-4 sm:pb-4">
        <span className="flex w-full items-center gap-2 rounded-full bg-white px-2.5 py-2 shadow-sm sm:gap-2.5 sm:px-3 sm:py-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white sm:h-8 sm:w-8"
            style={{ backgroundColor: ACC_BLUE }}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} />
          </span>
          <span
            className="min-w-0 flex-1 truncate text-[12px] font-extrabold leading-tight sm:text-[13px] md:text-[14px]"
            style={{ color: ACC_BLUE }}
          >
            {page.label}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" style={{ color: ACC_BLUE }} strokeWidth={2.4} />
        </span>
      </span>
    </Link>
  );
}

export default function Categories({
  showHeading = true,
}: {
  showHeading?: boolean;
}) {
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
    <section id="categories" className="bg-white py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? <AccessoriesHeroBanner /> : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ACCESSORY_NAV_PAGES.map((page, i) => (
            <AccessoryCategoryTile
              key={page.group}
              page={page}
              index={i}
              img={tiles[page.group]?.img ?? null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
