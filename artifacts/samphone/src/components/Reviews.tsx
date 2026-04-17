import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, BadgeCheck } from "lucide-react";

const reviews = [
  { name: "Ana Rodrigues", date: "March 2025", rating: 5, text: "Ordered a replacement screen for my iPhone 14 and it arrived the next day in perfect condition. The quality is excellent — identical to the original. Highly recommend SAMPHONE!", avatar: "https://i.pravatar.cc/100?img=5" },
  { name: "Miguel Santos", date: "February 2025", rating: 5, text: "I'm a technician and I buy parts here weekly. The prices are fair, the quality is consistent, and the team always helps me find the right part. Best supplier in Lisbon.", avatar: "https://i.pravatar.cc/100?img=8" },
  { name: "Sofia Pereira", date: "January 2025", rating: 5, text: "Bought a case for my Samsung S24 and a charger. Fast delivery and great packaging. The case fits perfectly and feels premium. Will definitely order again.", avatar: "https://i.pravatar.cc/100?img=9" },
  { name: "James Thompson", date: "March 2025", rating: 4, text: "Tourist who needed a charging cable urgently. Found SAMPHONE online, ordered, and it arrived within hours. Saved my trip! Great service.", avatar: "https://i.pravatar.cc/100?img=12" },
  { name: "Carlos Ferreira", date: "December 2024", rating: 5, text: "A battery replacement for my Xiaomi that works perfectly. I was skeptical about the price but the quality surpassed my expectations. Legit shop.", avatar: "https://i.pravatar.cc/100?img=15" },
  { name: "Beatriz Lopes", date: "February 2025", rating: 5, text: "The Bluetooth earphones I bought are incredible for the price. Crystal clear audio. SAMPHONE has become my go-to for all accessories.", avatar: "https://i.pravatar.cc/100?img=16" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Reviews() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

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
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Customer Reviews
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-2xl font-display font-bold text-foreground ml-1">4.9/5</span>
          </div>
          <p className="text-muted-foreground">Based on 600+ verified reviews</p>
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
                    <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed flex-1">"{review.text}"</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
