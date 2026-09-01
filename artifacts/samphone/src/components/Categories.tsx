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
    <section id="categories" className="bg-[#F4F6F8] py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? (
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
            <div>
              <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight text-[#1A2B48] md:text-[2.15rem]">
                {t("home_accessories_title")}
              </h2>
              <span className="mt-2 block h-[4px] w-12 rounded-full bg-sam" />
              <p className="mt-3 max-w-xl text-[14px] font-medium text-[#6B7280]">
                {t("home_accessories_sub")}
              </p>
            </div>
            <Link
              href="/accessories"
              className="inline-flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide text-brand hover:text-brand-dark"
            >
              {t("home_accessories_shop")}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {ACCESSORY_NAV_PAGES.map((page, i) => {
            const data = tiles[page.group];
            const countLabel =
              data && data.count > 0 ? `${data.count} ${t("home_accessories_items")}` : "\u00a0";
            const Icon = groupIcon(page.group);
            return (
              <Link
                key={page.group}
                href={accessoryPageHref(page.group)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_12px_28px_rgba(26,43,72,0.1)]"
                data-testid={`card-category-${i}`}
              >
                <span className="relative flex aspect-square items-center justify-center bg-[#F7F8FA] p-4">
                  {data?.img ? (
                    <CatalogImage
                      src={data.img}
                      alt={page.label}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sam text-[#1A2B48]">
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col px-3 pb-3.5 pt-3">
                  <h3 className="text-[14px] font-extrabold leading-tight text-[#1A2B48] sm:text-[15px]">
                    {page.label}
                  </h3>
                  <p className="mt-1 text-[12px] font-medium text-[#8B93A3]">{countLabel}</p>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
