import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, X } from "lucide-react";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";
import { groupIcon } from "@/components/AccessoryFilterChip";
import { useLang } from "@/contexts/LanguageContext";
import {
  ACCESSORY_NAV_PAGES,
  accessoryPageHref,
  type AccessoryNavPage,
} from "@/data/accessory-pages";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import accessoriesProducts from "@/assets/mobile-accessories-products.png";

const circleBasis =
  "basis-[38%] min-[400px]:basis-[30%] sm:basis-[22%] md:basis-[16%] lg:basis-[13%] xl:basis-[11%]";

function AccessoriesHeroBanner() {
  const { t } = useLang();

  return (
    <Link
      href="/accessories"
      className="group relative mb-6 block overflow-hidden rounded-[1.25rem] md:mb-8 md:rounded-[1.5rem]"
      aria-label={t("home_accessories_title")}
    >
      <div className="relative flex min-h-[9.75rem] items-stretch overflow-hidden bg-brand sm:min-h-[11.5rem] md:min-h-[13.75rem] lg:min-h-[15.5rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-brand-dark opacity-40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[46%] bg-sam sm:w-[44%] md:w-[42%]"
          style={{
            borderTopLeftRadius: "58% 100%",
            borderBottomLeftRadius: "72% 100%",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-sam opacity-50"
        />

        <div className="relative z-10 grid w-full grid-cols-[1.15fr_1fr] items-center sm:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col justify-center px-5 py-6 sm:px-7 sm:py-8 md:px-10 md:py-10 lg:px-12">
            <span className="mb-3 block h-[3px] w-10 rounded-full bg-sam sm:mb-4 sm:w-12" aria-hidden />
            <h2 className="font-display text-[1.5rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[1.95rem] md:text-[2.4rem] lg:text-[2.75rem]">
              {t("home_accessories_title_mobile")}{" "}
              <span className="text-sam">{t("home_accessories_title_accessories")}</span>
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

function AccessoryCircle({ page, index }: { page: AccessoryNavPage; index: number }) {
  const Icon = groupIcon(page.group);

  return (
    <Link
      href={accessoryPageHref(page.group)}
      className="group flex flex-col items-center gap-2.5"
      data-testid={`card-category-${index}`}
    >
      <span className="flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full bg-[#F4F6FB] text-brand shadow-[0_6px_18px_rgba(36,63,159,0.1)] ring-1 ring-brand/10 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-sam group-hover:text-white group-hover:ring-sam sm:h-[6.25rem] sm:w-[6.25rem]">
        <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.7} />
      </span>
      <span className="max-w-[6.75rem] text-center text-[12px] font-semibold leading-tight text-brand sm:text-[13px]">
        {page.label}
      </span>
    </Link>
  );
}

export default function Categories({
  showHeading = true,
  showFilters = true,
}: {
  showHeading?: boolean;
  showFilters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const visiblePages = useMemo(() => {
    if (!showFilters) return ACCESSORY_NAV_PAGES;
    const q = query.trim().toLowerCase();
    return ACCESSORY_NAV_PAGES.filter((page) => {
      if (activeGroup && page.group !== activeGroup) return false;
      if (!q) return true;
      const hay = `${page.label} ${page.group} ${page.subtypes.map((s) => s.label).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeGroup, showFilters]);

  return (
    <section id="categories" className="bg-white py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {showHeading ? <AccessoriesHeroBanner /> : null}

        {showFilters ? (
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
              <CatalogTypeChip active={activeGroup == null} onClick={() => setActiveGroup(null)}>
                All
              </CatalogTypeChip>
              {ACCESSORY_NAV_PAGES.map((page) => (
                <CatalogTypeChip
                  key={page.group}
                  active={activeGroup === page.group}
                  onClick={() => setActiveGroup(activeGroup === page.group ? null : page.group)}
                  icon={groupIcon(page.group)}
                >
                  {page.label}
                </CatalogTypeChip>
              ))}
            </div>
          </div>
        ) : null}

        {visiblePages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No categories match your filters.</p>
        ) : (
          <div className="relative px-8 sm:px-10">
            <Carousel opts={{ align: "start", loop: true, dragFree: true }} className="w-full">
              <CarouselContent className="-ml-2 sm:-ml-3">
                {visiblePages.map((page, i) => (
                  <CarouselItem key={page.group} className={cn("pl-2 sm:pl-3", circleBasis)}>
                    <AccessoryCircle page={page} index={i} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 top-[2.6rem] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-brand text-white shadow-md hover:bg-brand-dark sm:top-[3.1rem]" />
              <CarouselNext className="right-0 top-[2.6rem] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-brand text-white shadow-md hover:bg-brand-dark sm:top-[3.1rem]" />
            </Carousel>
          </div>
        )}
      </div>
    </section>
  );
}
