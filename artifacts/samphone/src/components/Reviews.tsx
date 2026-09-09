import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, BadgeCheck } from "lucide-react";
import { useLang, type TranslationKey } from "@/contexts/LanguageContext";

const reviews: { name: string; dateKey: TranslationKey; rating: number; textKey: TranslationKey; avatar: string }[] = [
  { name: "Ana Rodrigues", dateKey: "review_date_1", rating: 5, textKey: "review_text_1", avatar: "https://i.pravatar.cc/100?img=5" },
  { name: "Miguel Santos", dateKey: "review_date_2", rating: 5, textKey: "review_text_2", avatar: "https://i.pravatar.cc/100?img=8" },
  { name: "Sofia Pereira", dateKey: "review_date_3", rating: 5, textKey: "review_text_3", avatar: "https://i.pravatar.cc/100?img=9" },
  { name: "James Thompson", dateKey: "review_date_4", rating: 4, textKey: "review_text_4", avatar: "https://i.pravatar.cc/100?img=12" },
  { name: "Carlos Ferreira", dateKey: "review_date_5", rating: 5, textKey: "review_text_5", avatar: "https://i.pravatar.cc/100?img=15" },
  { name: "Beatriz Lopes", dateKey: "review_date_6", rating: 5, textKey: "review_text_6", avatar: "https://i.pravatar.cc/100?img=16" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Reviews() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLang();

  return (
    <section id="reviews" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-sam/20 text-brand text-sm font-medium mb-4">
            {t("reviews_badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-brand mb-4">
            {t("reviews_title")}
          </h2>
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-sam text-sam" />
            ))}
            <span className="text-2xl font-display font-bold text-foreground ml-1">4.9/5</span>
          </div>
          <p className="text-muted-foreground">{t("reviews_based_on")}</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col"
              data-testid={`card-review-${i}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <img src={review.avatar} alt={review.name} className="w-11 h-11 rounded-full object-cover border-2 border-primary/20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-foreground text-sm truncate">{review.name}</p>
                    <BadgeCheck className="w-4 h-4 text-brand shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t(review.dateKey)}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-sam text-sam" />
                  ))}
                </div>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed flex-1">"{t(review.textKey)}"</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
