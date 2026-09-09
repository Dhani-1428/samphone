import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import homeBanner from "@/assets/banner home.webp";

export default function HomeBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const { t } = useLang();

  return (
    <section className="py-12 md:py-16 bg-background" aria-label={t("hero_badge")}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="container mx-auto px-4 md:px-6"
      >
        <Link
          href="/store"
          className="relative block overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md ring-1 ring-black/[0.04]"
        >
          <img
            src={homeBanner}
            alt={t("hero_badge")}
            className="h-auto w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1A2F7A]/95 via-[#243F9F]/65 to-[#243F9F]/15"
          />
          <div className="absolute inset-0 flex items-center px-6 sm:px-10 md:px-14">
            <div className="max-w-xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sam sm:text-xs">
                {t("hero_badge")}
              </p>
              <p className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">
                {t("hero_line1")} {t("hero_line2")} {t("hero_line3")}
              </p>
              <p className="mt-2 hidden max-w-md text-sm font-medium text-white/90 sm:block">{t("hero_sub")}</p>
              <span className="mt-4 inline-flex rounded-full bg-sam px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand sm:text-sm">
                {t("hero_shop")}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
