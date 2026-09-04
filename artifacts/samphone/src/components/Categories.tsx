import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, X } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";
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
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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

  const visiblePages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACCESSORY_NAV_PAGES.filter((page) => {
      if (activeGroup && page.group !== activeGroup) return false;
      if (!q) return true;
      const hay = `${page.label} ${page.group} ${page.subtypes.map((s) => s.label).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeGroup]);

  return (
    <section id="categories" className="bg-[#F5F5F5] py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? (
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
            <div>
              <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight text-brand md:text-[2.15rem]">
                {t("home_accessories_title")}
              </h2>
              <span className="mt-2 block h-[4px] w-12 rounded-full bg-sam" />
              <p className="mt-3 max-w-xl text-[14px] font-medium text-[#6B7280]">
                {t("home_accessories_sub")}
              </p>
            </div>
            <Link
              href="/accessories"
              className="inline-flex items-center gap-1.5 rounded-md bg-sam px-3.5 py-2 text-[13px] font-extrabold uppercase tracking-wide text-white hover:bg-sam-dark"
            >
              {t("home_accessories_shop")}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </div>
        ) : null}

        <div className="mb-6 rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accessories…"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sam/30"
              aria-label="Search accessories"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CatalogTypeChip
              active={activeGroup == null}
              onClick={() => setActiveGroup(null)}
            >
              All
            </CatalogTypeChip>
            {ACCESSORY_NAV_PAGES.map((page) => (
              <CatalogTypeChip
                key={page.group}
                active={activeGroup === page.group}
                onClick={() =>
                  setActiveGroup(activeGroup === page.group ? null : page.group)
                }
                icon={groupIcon(page.group)}
              >
                {page.label}
              </CatalogTypeChip>
            ))}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {visiblePages.length} {t("home_accessories_items")}
          </p>
        </div>

        {visiblePages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No categories match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visiblePages.map((page, i) => {
              const data = tiles[page.group];
              const countLabel =
                data && data.count > 0 ? `${data.count} ${t("home_accessories_items")}` : "\u00a0";
              const Icon = groupIcon(page.group);
              return (
                <Link
                  key={page.group}
                  href={accessoryPageHref(page.group)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-brand/10 bg-white shadow-[0_4px_14px_rgba(45,79,160,0.06)] transition-all hover:-translate-y-0.5 hover:border-sam hover:shadow-[0_12px_28px_rgba(45,79,160,0.12)]"
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
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sam text-white">
                        <Icon className="h-7 w-7" strokeWidth={1.8} />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col px-3 pb-3.5 pt-3">
                    <h3 className="text-[14px] font-extrabold leading-tight text-brand sm:text-[15px]">
                      {page.label}
                    </h3>
                    <p className="mt-1 text-[12px] font-medium text-[#8B93A3]">{countLabel}</p>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
