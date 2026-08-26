import { Link } from "wouter";
import {
  BatteryCharging,
  Cable,
  Headphones,
  Plug,
  Smartphone,
  Speaker,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { accessoryPageHref } from "@/data/accessory-pages";

const EMPTY_CART_VIDEO = "/video/empty-cart.mp4";

const POPULAR = [
  { labelKey: "cart_empty_cat_chargers" as const, href: accessoryPageHref("Chargers"), Icon: Plug },
  { labelKey: "cart_empty_cat_cables" as const, href: accessoryPageHref("Cables"), Icon: Cable },
  { labelKey: "cart_empty_cat_headphones" as const, href: accessoryPageHref("Headphones"), Icon: Headphones },
  { labelKey: "cart_empty_cat_powerbanks" as const, href: accessoryPageHref("Powerbanks"), Icon: BatteryCharging },
  { labelKey: "cart_empty_cat_speakers" as const, href: accessoryPageHref("Speakers"), Icon: Speaker },
  { labelKey: "cart_empty_cat_cases" as const, href: "/accessories", Icon: Smartphone },
];

function CategoryCard({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-3 py-5 text-center shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF6E8] text-sam">
        <Icon className="h-6 w-6" strokeWidth={2.1} />
      </span>
      <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#1F4E9E]">{label}</span>
    </Link>
  );
}

export default function EmptyCartHero() {
  const { t } = useLang();

  return (
    <section className="bg-white">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-5 py-10 sm:px-8 md:px-10 lg:grid-cols-2 lg:gap-14 lg:px-14 lg:py-14">
        <div className="relative mx-auto w-full max-w-xl overflow-hidden lg:max-w-none">
          {/* Crop the fake header/navbar baked into the animation video. */}
          <div className="relative aspect-[5/4] overflow-hidden bg-white">
            <video
              src={EMPTY_CART_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-[165%] w-[165%] max-w-none -translate-x-[42%] -translate-y-[8%] object-cover object-[18%_38%]"
            />
          </div>
        </div>

        <div className="max-w-xl lg:max-w-none">
          <h1 className="font-display text-[2.15rem] font-extrabold uppercase leading-[1.05] tracking-tight text-[#1F4E9E] sm:text-5xl">
            {t("cart_empty_title")}
          </h1>
          <span className="mt-4 block h-[5px] w-16 rounded-sm bg-sam" aria-hidden />
          <p className="mt-5 text-lg font-extrabold uppercase leading-snug text-[#1F4E9E] sm:text-xl">
            {t("cart_empty_bored")}
          </p>
          <p className="mt-3 max-w-md text-[15px] font-medium leading-relaxed text-neutral-500">
            {t("cart_empty_fix")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-sam px-6 text-[13px] font-extrabold uppercase tracking-wide text-white hover:bg-sam/90"
            >
              {t("cart_empty_start")}
            </Link>
            <Link
              href="/accessories"
              className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-[#1F4E9E] bg-white px-6 text-[13px] font-extrabold uppercase tracking-wide text-[#1F4E9E] hover:bg-[#F4F7FC]"
            >
              {t("cart_empty_explore")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 sm:px-8 md:px-10 lg:px-14">
        <h2 className="mb-8 text-center text-[15px] font-extrabold uppercase tracking-wide text-[#1F4E9E] sm:text-lg">
          {t("cart_empty_popular")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {POPULAR.map((item) => (
            <CategoryCard key={item.labelKey} href={item.href} label={t(item.labelKey)} Icon={item.Icon} />
          ))}
        </div>
      </div>
    </section>
  );
}
