import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLang } from "@/contexts/LanguageContext";
import homeBanner from "@/assets/banner home.webp";

export default function HomeBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const { lang } = useLang();

  const alt =
    lang === "pt"
      ? "SAMPHONE — acessórios e peças para telemóveis"
      : "SAMPHONE — mobile accessories and parts";

  return (
    <section className="py-12 md:py-16 bg-background" aria-label={alt}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="container mx-auto px-4 md:px-6"
      >
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md ring-1 ring-black/[0.04]">
          <img
            src={homeBanner}
            alt={alt}
            className="w-full h-auto object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        </div>
      </motion.div>
    </section>
  );
}
