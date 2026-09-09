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
import { useTranslatedText } from "@/hooks/useTranslatedText";
import { cn } from "@/lib/utils";

const navInset = "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

const itemBasis =
  "basis-[86%] min-[400px]:basis-[58%] sm:basis-[46%] md:basis-[36%] lg:basis-[30%] xl:basis-[24%] 2xl:basis-[22%]";

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
  const heading = useTranslatedText(title);
  const sub = useTranslatedText(subtitle);
  const [api, setApi] = useState<CarouselApi>();
  const [pageIndex, setPageIndex] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    if (!api || items.length < 3 || paused) return;
    const id = window.setInterval(() => {
      api.scrollNext();
    }, 4200);
    return () => {
      window.clearInterval(id);
    };
  }, [api, items.length, paused]);

  return (
    <section className="py-8 md:py-10">
      <div className={navInset}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight text-brand md:text-[2.15rem]">{heading}</h2>
            <span className="mt-2 block h-[4px] w-12 rounded-full bg-sam" />
            {sub ? <p className="mt-2 text-sm text-muted-foreground">{sub}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              {t("newArrivals_page")} {pageIndex} {t("newArrivals_of")} {pageTotal}
            </span>
            <Link href={seeAllHref} className="text-sm font-extrabold uppercase tracking-wide text-brand hover:text-sam-dark">
              {t("newArrivals_see_all")}
            </Link>
          </div>
        </div>

        <div
          className="relative px-8 sm:px-10"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <Carousel setApi={setApi} opts={{ align: "start", loop: true, duration: 55 }} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-4">
              {items.map((child, i) => (
                <CarouselItem key={i} className={cn("overflow-visible pl-3 md:pl-4", itemBasis)}>
                  <div className="relative z-0 h-full origin-center will-change-transform transition-[transform,box-shadow] duration-300 ease-out hover:z-20 hover:-translate-y-2 hover:scale-[1.035] hover:shadow-[0_22px_44px_rgba(36,63,159,0.22)]">
                    {child}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 top-[42%] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-brand text-white shadow-md hover:bg-brand-dark" />
            <CarouselNext className="right-0 top-[42%] z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-brand text-white shadow-md hover:bg-brand-dark" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
