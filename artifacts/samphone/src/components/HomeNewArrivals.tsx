import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { NEW_ARRIVALS_PRODUCTS, hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import WooProductCard from "@/components/wc/WooProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { sortNewest } from "@/lib/woo-product-filters";
import { cn } from "@/lib/utils";

const navInset =
  "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

function brandFromSubtitle(subtitle?: string) {
  if (!subtitle) return "";
  return subtitle.split("·")[0]?.trim() ?? "";
}

export default function HomeNewArrivals() {
  const { user } = useAuth();
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();
  const wooRows = useMemo(() => (woo ? sortNewest(products).slice(0, 14) : []), [woo, products]);

  const [api, setApi] = useState<CarouselApi>();
  const [pageIndex, setPageIndex] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setPageTotal(Math.max(1, api.scrollSnapList().length));
      setPageIndex(api.selectedScrollSnap() + 1);
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  const itemBasis =
    "basis-[82%] min-[400px]:basis-[48%] sm:basis-[38%] md:basis-[28%] lg:basis-[22%] xl:basis-[17.5%] 2xl:basis-[14.285%]";

  return (
    <section
      className="py-10 md:py-14 bg-muted/40 border-b border-border/70"
      aria-labelledby="home-new-arrivals-heading"
    >
      <div className={navInset}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h2
              id="home-new-arrivals-heading"
              className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight"
            >
              {t("newArrivals_section_title")}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm md:text-base max-w-xl">
              {t("newArrivals_section_sub")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("newArrivals_page")} {pageIndex} {t("newArrivals_of")} {pageTotal}
            </span>
            <Link
              href="/new"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {t("newArrivals_see_all")}
            </Link>
          </div>
        </div>

        <div className="relative px-8 sm:px-10 md:px-11">
          <Carousel
            setApi={setApi}
            opts={{ align: "start", loop: false, dragFree: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {woo &&
                wooRows.map((product) => (
                  <CarouselItem key={product.id} className={cn("pl-3 md:pl-4", itemBasis)}>
                    <WooProductCard product={product} priceUnavailableLabel={t("woo_price_na")} />
                  </CarouselItem>
                ))}

              {woo && loading && wooRows.length === 0 && (
                <CarouselItem className={cn("pl-3 md:pl-4", itemBasis)}>
                  <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                    {t("woo_loading")}
                  </div>
                </CarouselItem>
              )}

              {!woo &&
                NEW_ARRIVALS_PRODUCTS.map((product) => {
                  const { daysAgo: _d, ...card } = product;
                  const href = hrefForCartKey(card.cartKey);
                  const brand = brandFromSubtitle(card.subtitle);
                  return (
                    <CarouselItem key={card.cartKey} className={cn("pl-3 md:pl-4", itemBasis)}>
                      <article className="bg-card rounded-xl border border-border/70 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden">
                        <div className="relative aspect-square p-3 bg-gradient-to-b from-muted/30 to-background">
                          {card.badge && (
                            <span
                              className={cn(
                                "absolute top-2 left-2 z-10 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md",
                                card.badge === "New"
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {card.badge}
                            </span>
                          )}
                          {brand && (
                            <span className="absolute top-2 right-2 z-10 max-w-[48%] text-[10px] sm:text-xs font-bold uppercase tracking-tight text-muted-foreground text-right truncate">
                              {brand}
                            </span>
                          )}
                          <Link href={href} className="absolute inset-3 top-10 flex items-center justify-center">
                            <img
                              src={card.img}
                              alt={card.name}
                              className="max-h-full max-w-full object-contain drop-shadow-sm"
                            />
                          </Link>
                        </div>
                        <div className="p-3 pt-2 flex flex-col flex-1 gap-2 border-t border-border/50">
                          {user ? (
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-lg font-bold text-foreground tabular-nums leading-none">
                                €{card.price.toFixed(2)}
                              </span>
                              <ProductCartControls cartKey={card.cartKey} variant="compact" />
                            </div>
                          ) : (
                            <GuestPriceGate variant="compact" />
                          )}
                          <Link href={href} className="block group/title mt-auto">
                            <p className="text-sm text-muted-foreground group-hover/title:text-foreground transition-colors line-clamp-2 leading-snug">
                              {card.name}
                            </p>
                          </Link>
                        </div>
                      </article>
                    </CarouselItem>
                  );
                })}
            </CarouselContent>
            <CarouselPrevious
              variant="outline"
              className="z-20 h-10 w-10 rounded-full border-border bg-background shadow-md text-foreground hover:bg-muted left-0 sm:left-0.5 top-[42%] -translate-y-1/2"
            />
            <CarouselNext
              variant="outline"
              className="z-20 h-10 w-10 rounded-full border-border bg-background shadow-md text-foreground hover:bg-muted right-0 sm:right-0.5 top-[42%] -translate-y-1/2"
            />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
