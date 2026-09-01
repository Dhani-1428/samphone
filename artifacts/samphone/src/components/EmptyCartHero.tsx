import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BatteryCharging,
  Cable,
  Headphones,
  PlugZap,
  Smartphone,
  Speaker,
  type LucideIcon,
} from "lucide-react";
import { accessoryPageHref } from "@/data/accessory-pages";
import { useLang } from "@/contexts/LanguageContext";

const NAVY = "#1A2B48";
const ORANGE = "#F39223";

const POPULAR: { labelKey: "cart_empty_cat_chargers" | "cart_empty_cat_cables" | "cart_empty_cat_headphones" | "cart_empty_cat_powerbanks" | "cart_empty_cat_speakers" | "cart_empty_cat_cases"; href: string; Icon: LucideIcon }[] = [
  { labelKey: "cart_empty_cat_chargers", href: accessoryPageHref("Chargers"), Icon: PlugZap },
  { labelKey: "cart_empty_cat_cables", href: accessoryPageHref("Cables"), Icon: Cable },
  { labelKey: "cart_empty_cat_headphones", href: accessoryPageHref("Headphones"), Icon: Headphones },
  { labelKey: "cart_empty_cat_powerbanks", href: accessoryPageHref("Powerbanks"), Icon: BatteryCharging },
  { labelKey: "cart_empty_cat_speakers", href: accessoryPageHref("Speakers"), Icon: Speaker },
  { labelKey: "cart_empty_cat_cases", href: "/category/silicon-soft-jelly", Icon: Smartphone },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function splitPopular(text: string) {
  const i = text.indexOf("?");
  if (i === -1) return { first: text, second: "" };
  return { first: text.slice(0, i + 1).trim(), second: text.slice(i + 1).trim() };
}

export default function EmptyCartHero() {
  const { t } = useLang();
  const popular = splitPopular(t("cart_empty_popular"));

  return (
    <section className="empty-cart-page bg-[#F8F9FB]">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-12">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-10 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[34rem]"
          >
            <picture>
              <source srcSet="/images/empty-cart-scene.webp" type="image/webp" />
              <img
                src="/images/empty-cart-scene.png"
                alt=""
                width={640}
                height={485}
                className="h-auto w-full select-none"
                draggable={false}
              />
            </picture>
          </motion.div>

          <div className="text-center md:text-left">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.5, delay: 0.22 }}
              className="font-display text-[1.7rem] font-extrabold uppercase leading-[1.15] tracking-tight sm:text-[2.05rem] lg:text-[2.35rem]"
              style={{ color: NAVY }}
            >
              {t("cart_empty_title")}
            </motion.h1>
            <motion.span
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.42, ease: "easeOut" }}
              className="mx-auto mt-3 block h-[5px] w-16 origin-left rounded-full md:mx-0"
              style={{ background: ORANGE }}
            />
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.5, delay: 0.52 }}
              className="mt-5 text-[0.95rem] font-extrabold uppercase leading-snug sm:text-[1.05rem]"
              style={{ color: NAVY }}
            >
              {t("cart_empty_bored")}
            </motion.p>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.5, delay: 0.68 }}
              className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#6B7280] md:mx-0"
            >
              {t("cart_empty_fix")}
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.5, delay: 0.84 }}
              className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:justify-start"
            >
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_18px_rgba(243,146,35,0.28)] transition-transform hover:-translate-y-0.5 hover:brightness-105"
                style={{ background: ORANGE }}
              >
                {t("cart_empty_start")}
              </Link>
              <Link
                href="/accessories"
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 bg-white px-6 text-[13px] font-extrabold uppercase tracking-wide transition-transform hover:-translate-y-0.5"
                style={{ borderColor: NAVY, color: NAVY }}
              >
                {t("cart_empty_explore")}
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5, delay: 1.05 }}
          className="mt-12 text-center md:mt-16"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em]" style={{ color: NAVY }}>
            {popular.first}
          </p>
          {popular.second ? (
            <p className="mt-1 text-[14px] font-extrabold uppercase tracking-[0.03em] sm:text-[15px]" style={{ color: NAVY }}>
              {popular.second}
            </p>
          ) : null}
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {POPULAR.map((item, i) => (
            <motion.div
              key={item.labelKey}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 1.18 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={item.href}
                className="flex aspect-[1.05/1] flex-col items-center justify-center gap-3 rounded-xl border border-[#E6EAF0] bg-white px-2 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:border-[#F39223]/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
              >
                <item.Icon className="h-10 w-10 sm:h-11 sm:w-11" style={{ color: ORANGE }} strokeWidth={1.65} />
                <span className="text-center text-[11px] font-extrabold uppercase tracking-wide sm:text-[12px]" style={{ color: NAVY }}>
                  {t(item.labelKey)}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
