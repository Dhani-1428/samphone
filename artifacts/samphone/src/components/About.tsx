import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLang();

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-sam/20 text-brand text-sm font-medium mb-5">
              {t("about_badge")}
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-brand mb-6 leading-tight">
              {t("about_title")}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">{t("about_p1")}</p>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("about_p2")}</p>

            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sam flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t("about_location")}</p>
                  <p className="text-muted-foreground text-sm">Rua da Palma N.221–223, 1100-391 Lisboa, Portugal</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sam flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t("about_phone_label")}</p>
                  <p className="text-muted-foreground text-sm">+351 937 119 295</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sam flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t("about_hours")}</p>
                  <p className="text-muted-foreground text-sm">{t("about_hours_value")}</p>
                </div>
              </div>
            </div>

            <a href="https://maps.google.com/?q=Rua+da+Palma+221+Lisboa+Portugal" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2 border-brand/30 text-brand hover:bg-brand hover:text-white" data-testid="button-get-directions">
                <MapPin className="w-4 h-4" /> {t("about_directions")} <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          >
            <div className="rounded-3xl overflow-hidden border border-border bg-card aspect-[4/5] flex flex-col">
              <iframe
                title="SAMPHONE"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3113.178!2d-9.137!3d38.717!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzjCsDQzJzAxLjIiTiA5wrAwOCcxMy4yIlc!5e0!3m2!1sen!2spt!4v1700000000000!5m2!1sen!2spt"
                className="w-full flex-1 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="p-5 flex items-center gap-3 border-t border-border bg-card">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-display font-bold shrink-0">
                  S
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">SAMPHONE</p>
                  <p className="text-xs text-muted-foreground">Rua da Palma N.221–223, Lisboa</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                  <span className="text-xs font-semibold text-foreground ml-1">4.9</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
