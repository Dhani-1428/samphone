import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { SITE_HOME_BANNERS } from "@/config/samphone";
import { useLang } from "@/contexts/LanguageContext";
import { fetchHeroBanners } from "@/lib/woocommerce";
import CatalogImage from "@/components/CatalogImage";

type Slide = { key: string; src: string };

function siteBannerSlides(): Slide[] {
  return SITE_HOME_BANNERS.map((src, i) => ({
    key: `site-${i}`,
    src,
  }));
}

export default function Hero() {
  const { t } = useLang();
  const [api, setApi] = useState<CarouselApi>();
  const [slides, setSlides] = useState<Slide[]>(() => siteBannerSlides());
  const alt = t("hero_badge");

  useEffect(() => {
    let cancelled = false;
    void fetchHeroBanners()
      .then((banners) => {
        if (cancelled || banners.length === 0) return;
        setSlides(
          banners.map((b) => ({
            key: `woo-${b.id}`,
            src: b.src,
          })),
        );
      })
      .catch(() => {
        /* keep www.samphone.pt homepage banners */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const id = window.setInterval(() => api.scrollNext(), 5500);
    return () => window.clearInterval(id);
  }, [api]);

  return (
    <section id="home" className="bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-8 sm:py-6 md:px-12 md:py-8 lg:px-16 lg:py-8">
        <Carousel
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          className="w-full overflow-hidden rounded-2xl bg-brand shadow-[0_8px_24px_rgba(45,79,160,0.16)]"
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide, i) => (
              <CarouselItem key={slide.key} className="pl-0">
                <div className="relative aspect-[5/2] w-full overflow-hidden bg-brand">
                  <CatalogImage
                    src={slide.src}
                    alt={alt}
                    className="h-full w-full object-cover object-center"
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "low"}
                    loading={i === 0 ? "eager" : "lazy"}
                    sizes="(min-width: 1600px) 1600px, 100vw"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1A2F7A]/95 via-[#243F9F]/70 to-[#243F9F]/10"
                  />
                  <div className="absolute inset-0 z-10 flex items-center">
                    <div className="max-w-[min(100%,38rem)] px-12 sm:px-16 md:px-20 lg:px-24">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sam sm:text-xs">
                        {t("hero_badge")}
                      </p>
                      <p className="font-display text-[1.35rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem]">
                        {t("hero_line1")} {t("hero_line2")}{" "}
                        <span className="text-sam">{t("hero_line3")}</span>
                      </p>
                      <p className="mt-2 hidden max-w-md text-[12px] font-medium leading-snug text-white/90 sm:mt-3 sm:block sm:text-sm md:text-[15px]">
                        {t("hero_sub")}
                      </p>
                      <Link
                        href="/store"
                        className="mt-3 inline-flex items-center rounded-full bg-sam px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-brand shadow-sm transition-colors hover:bg-white sm:mt-5 sm:px-5 sm:py-2.5 sm:text-sm"
                      >
                        {t("hero_shop")}
                      </Link>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white dark:bg-card dark:text-foreground md:left-5" />
          <CarouselNext className="right-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white dark:bg-card dark:text-foreground md:right-5" />
        </Carousel>
      </div>
    </section>
  );
}
