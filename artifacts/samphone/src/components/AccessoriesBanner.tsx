import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import accessoriesBanner from "@/assets/accessories.webp";

export default function AccessoriesBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const { lang } = useLang();

  const copy =
    lang === "pt"
      ? { label: "Acessórios", cta: "Ver acessórios" }
      : { label: "Accessories", cta: "Shop accessories" };

  return (
    <section className="pb-4 pt-2 bg-background" aria-label={copy.label}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="container mx-auto px-4 md:px-6"
      >
        <Link
          href="/accessories"
          className="group relative block overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md ring-1 ring-black/[0.04] transition-[box-shadow,transform] hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img
            src={accessoriesBanner}
            alt={copy.label}
            className="w-full h-auto max-h-[min(420px,55vw)] object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
          <span className="absolute bottom-4 right-4 md:bottom-6 md:right-6 inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {copy.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
