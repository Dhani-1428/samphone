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
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import type { WooProduct } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";

type Props = {
  currentProductId: number;
  /** Category IDs from the current product (for relevance). */
  categoryIds: number[];
  products: WooProduct[];
  priceUnavailableLabel: string;
};

export default function WooRelatedAccessoriesSlider({
  currentProductId,
  categoryIds,
  products,
  priceUnavailableLabel,
}: Props) {
  const { t } = useLang();
  const [api, setApi] = useState<CarouselApi>();
  const [pageIndex, setPageIndex] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);

  const related = useMemo(() => {
    const catSet = new Set(categoryIds.filter((id) => Number.isFinite(id) && id > 0));
    const others = products.filter((p) => p.id !== currentProductId);
    if (catSet.size === 0) return others.slice(0, 24);
    const scored = others
      .map((p) => ({
        p,
        score: (p.categories ?? []).reduce((n, c) => n + (catSet.has(c.id) ? 1 : 0), 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
      .map((x) => x.p);
    if (scored.length > 0) return scored.slice(0, 30);
    return others.slice(0, 24);
  }, [products, currentProductId, categoryIds]);

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

  /** ~6 cards visible on wide screens (reference layout). */
  const itemBasis =
    "basis-[82%] min-[420px]:basis-[48%] sm:basis-[33%] md:basis-[25%] lg:basis-[20%] xl:basis-[16.666%] 2xl:basis-[15%]";

  if (related.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10 md:mt-16 md:pt-12" aria-labelledby="related-accessories-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="related-accessories-heading" className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t("related_accessories_title")}
        </h2>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("newArrivals_page")} {pageIndex} {t("newArrivals_of")} {pageTotal}
          </span>
          <Link href="/store" className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
            {t("related_accessories_see_all")}
          </Link>
        </div>
      </div>

      <div className={cn("relative px-7 sm:px-9 md:px-10")}>
        <Carousel setApi={setApi} opts={{ align: "start", loop: false, dragFree: false }} className="w-full">
          <CarouselContent className="-ml-3 md:-ml-4">
            {related.map((p) => (
              <CarouselItem key={p.id} className={cn("pl-3 md:pl-4", itemBasis)}>
                <WooProductCard product={p} priceUnavailableLabel={priceUnavailableLabel} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-1 sm:-left-2 border-border bg-background shadow-md" />
          <CarouselNext className="-right-1 sm:-right-2 border-border bg-background shadow-md" />
        </Carousel>
      </div>
    </section>
  );
}
