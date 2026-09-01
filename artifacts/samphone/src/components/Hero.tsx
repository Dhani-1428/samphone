import { useEffect, useState } from "react";
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

type Slide = { key: string; src: string; alt: string };

function siteBannerSlides(lang: string): Slide[] {
  const alt = lang === "pt" ? "SAMPHONE — destaques da loja" : "SAMPHONE — store highlights";
  return SITE_HOME_BANNERS.map((src, i) => ({
    key: `site-${i}`,
    src,
    alt,
  }));
}

export default function Hero() {
  const { lang } = useLang();
  const [api, setApi] = useState<CarouselApi>();
  const [slides, setSlides] = useState<Slide[]>(() => siteBannerSlides(lang));

  useEffect(() => {
    let cancelled = false;
    void fetchHeroBanners()
      .then((banners) => {
        if (cancelled || banners.length === 0) return;
        setSlides(
          banners.map((b) => ({
            key: `woo-${b.id}`,
            src: b.src,
            alt: b.alt || (lang === "pt" ? "SAMPHONE" : "SAMPHONE"),
          })),
        );
      })
      .catch(() => {
        /* keep www.samphone.pt homepage banners */
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

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
                    alt={slide.alt}
                    className="h-full w-full object-contain object-center"
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "low"}
                    loading={i === 0 ? "eager" : "lazy"}
                    sizes="(min-width: 1600px) 1600px, 100vw"
                  />
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
