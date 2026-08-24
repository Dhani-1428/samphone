import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLang } from "@/contexts/LanguageContext";
import { fetchHeroBanners } from "@/lib/woocommerce";
import CatalogImage from "@/components/CatalogImage";
import homeHeroVideo from "@/assets/home-hero-video.mp4";
import homeBanner from "@/assets/banner home.webp";
import accessoriesBanner from "@/assets/accessories.webp";

type Slide =
  | { key: string; kind: "video"; src: string; label: string }
  | { key: string; kind: "image"; src: string; alt: string };

export default function Hero() {
  const { t, lang } = useLang();
  const [api, setApi] = useState<CarouselApi>();
  const [storeSlides, setStoreSlides] = useState<Slide[] | null>(null);
  const slides = storeSlides && storeSlides.length > 0 ? storeSlides : fallbackSlides(t("hero_line2"), lang);

  useEffect(() => {
    let cancelled = false;
    void fetchHeroBanners()
      .then((banners) => {
        if (cancelled || banners.length === 0) return;
        setStoreSlides(
          banners.map((b) => ({
            key: `woo-${b.id}`,
            kind: "image" as const,
            src: b.src,
            alt: b.alt,
          })),
        );
      })
      .catch(() => {
        /* keep local fallback slides */
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
          className="w-full overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide) => (
              <CarouselItem key={slide.key} className="pl-0">
                <div className="relative h-[200px] w-full overflow-hidden bg-muted sm:h-[280px] md:h-[360px] lg:h-[420px]">
                  {slide.kind === "video" ? (
                    <video
                      className="h-full w-full object-cover"
                      src={slide.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label={slide.label}
                    />
                  ) : (
                    <CatalogImage
                      src={slide.src}
                      alt={slide.alt}
                      className="h-full w-full object-cover object-center"
                      decoding="async"
                    />
                  )}
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

function fallbackSlides(videoLabel: string, lang: string): Slide[] {
  return [
    {
      key: "video",
      kind: "video",
      src: homeHeroVideo,
      label: videoLabel,
    },
    {
      key: "banner",
      kind: "image",
      src: homeBanner,
      alt: lang === "pt" ? "SAMPHONE — acessórios e peças" : "SAMPHONE — accessories and parts",
    },
    {
      key: "accessories",
      kind: "image",
      src: accessoriesBanner,
      alt: lang === "pt" ? "Acessórios SAMPHONE" : "SAMPHONE accessories",
    },
  ];
}
