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
import homeHeroVideo from "@/assets/home-hero-video.mp4";
import homeBanner from "@/assets/banner home.webp";
import accessoriesBanner from "@/assets/accessories.webp";

export default function Hero() {
  const { t, lang } = useLang();
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    const id = window.setInterval(() => api.scrollNext(), 5500);
    return () => window.clearInterval(id);
  }, [api]);

  const slides = [
    {
      key: "video",
      node: (
        <video
          className="h-full w-full object-cover"
          src={homeHeroVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-label={t("hero_line2")}
        />
      ),
    },
    {
      key: "banner",
      node: (
        <img
          src={homeBanner}
          alt={lang === "pt" ? "SAMPHONE — acessórios e peças" : "SAMPHONE — accessories and parts"}
          className="h-full w-full object-cover object-center"
        />
      ),
    },
    {
      key: "accessories",
      node: (
        <img
          src={accessoriesBanner}
          alt={lang === "pt" ? "Acessórios SAMPHONE" : "SAMPHONE accessories"}
          className="h-full w-full object-cover object-center"
        />
      ),
    },
  ];

  return (
    <section id="home" className="bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-8 sm:py-6 md:px-12 md:py-8 lg:px-16 lg:py-8">
        <Carousel
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          className="w-full overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide) => (
              <CarouselItem key={slide.key} className="pl-0">
                <div className="relative h-[200px] w-full overflow-hidden sm:h-[280px] md:h-[360px] lg:h-[420px]">
                  {slide.node}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white md:left-5" />
          <CarouselNext className="right-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white text-navy shadow-md hover:bg-white md:right-5" />
        </Carousel>
      </div>
    </section>
  );
}
