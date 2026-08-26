import { Children, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const navInset = "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

const itemBasis =
  "basis-[78%] min-[400px]:basis-[48%] sm:basis-[38%] md:basis-[28%] lg:basis-[22%] xl:basis-[18%] 2xl:basis-[15%]";

export default function HomeProductRail({
  title,
  subtitle,
  seeAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref: string;
  children: ReactNode;
}) {
  const { t } = useLang();
  const [api, setApi] = useState<CarouselApi>();
  const [pageIndex, setPageIndex] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);
  const items = Children.toArray(children);

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

  return (
    <section className="py-8 md:py-10">
      <div className={navInset}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              {t("newArrivals_page")} {pageIndex} {t("newArrivals_of")} {pageTotal}
            </span>
            <Link href={seeAllHref} className="text-sm font-semibold text-[#2B5CB8] hover:underline">
              {t("newArrivals_see_all")}
            </Link>
          </div>
        </div>

        <div className="relative px-8 sm:px-10">
          <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-4">
              {items.map((child, i) => (
                <CarouselItem key={i} className={cn("pl-3 md:pl-4", itemBasis)}>
                  {child}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 top-[42%] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white dark:bg-card dark:text-foreground" />
            <CarouselNext className="right-0 top-[42%] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white dark:bg-card dark:text-foreground" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
