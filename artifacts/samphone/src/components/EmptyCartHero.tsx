import { Link } from "wouter";
import { accessoryPageHref } from "@/data/accessory-pages";
import { useLang } from "@/contexts/LanguageContext";

const EMPTY_CART_VIDEO = "/video/empty-cart.mp4";

const POPULAR = [
  { labelKey: "cart_empty_cat_chargers" as const, href: accessoryPageHref("Chargers") },
  { labelKey: "cart_empty_cat_cables" as const, href: accessoryPageHref("Cables") },
  { labelKey: "cart_empty_cat_headphones" as const, href: accessoryPageHref("Headphones") },
  { labelKey: "cart_empty_cat_powerbanks" as const, href: accessoryPageHref("Powerbanks") },
  { labelKey: "cart_empty_cat_speakers" as const, href: accessoryPageHref("Speakers") },
  { labelKey: "cart_empty_cat_cases" as const, href: "/accessories" },
];

export default function EmptyCartHero() {
  const { t } = useLang();

  return (
    <section className="bg-white">
      <div className="flex min-h-[calc(100dvh-var(--site-header-h,9rem))] items-center justify-center px-0">
        <div className="relative w-full max-w-[min(100%,calc((100dvh-var(--site-header-h,9rem))*16/9))]">
          <div className="relative aspect-video w-full bg-white">
            <video
              src={EMPTY_CART_VIDEO}
              width={1280}
              height={720}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-contain object-center"
            />
            <div className="absolute inset-0 grid grid-rows-[58%_16%_26%]">
              <div />
              <div className="flex items-center justify-end gap-3 pr-[6%] sm:pr-[8%]">
                <Link
                  href="/"
                  className="h-10 w-[42%] max-w-[14rem] sm:h-12"
                  aria-label={t("cart_empty_start")}
                />
                <Link
                  href="/accessories"
                  className="h-10 w-[42%] max-w-[16rem] sm:h-12"
                  aria-label={t("cart_empty_explore")}
                />
              </div>
              <div className="grid grid-cols-6 gap-1 px-[5%] pb-[5%] pt-2 sm:gap-2 sm:px-[6%]">
                {POPULAR.map((item) => (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    className="min-h-0"
                    aria-label={t(item.labelKey)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
