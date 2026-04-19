import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, ShoppingCart, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const newProducts = [
  { id: 1, name: "iPhone 16 Pro Titanium Case", brand: "Apple", price: 22.99, rating: 4.9, reviews: 12, img: productCase, daysAgo: 1, category: "Cases" },
  { id: 2, name: "Samsung S25 Tempered Glass", brand: "Samsung", price: 8.99, rating: 4.8, reviews: 8, img: productScreen, daysAgo: 2, category: "Protection" },
  { id: 3, name: "140W GaN Charger (Triple Port)", brand: "Generic", price: 39.99, rating: 4.7, reviews: 5, img: productCharger, daysAgo: 2, category: "Chargers" },
  { id: 4, name: "Xiaomi 15 Battery Pack", brand: "Xiaomi", price: 32.99, rating: 4.8, reviews: 14, img: productCase, daysAgo: 3, category: "Parts" },
  { id: 5, name: "Pixel 9 Pro Screen Assembly", brand: "Google", price: 94.99, rating: 4.9, reviews: 7, img: productScreen, daysAgo: 4, category: "Parts" },
  { id: 6, name: "MagSafe Wallet Case - iPhone 16", brand: "Apple", price: 27.99, rating: 4.8, reviews: 21, img: productCase, daysAgo: 5, category: "Cases" },
  { id: 7, name: "USB4 240W Cable 2m", brand: "Generic", price: 16.99, rating: 4.7, reviews: 9, img: productCharger, daysAgo: 6, category: "Cables" },
  { id: 8, name: "OnePlus 13 Rear Camera Module", brand: "OnePlus", price: 42.99, rating: 4.6, reviews: 6, img: productScreen, daysAgo: 7, category: "Parts" },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } } };

export default function NewArrivals() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div className="bg-background min-h-screen">
      {/* Animated header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 py-12 md:py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-white/10"
        />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-white/80 animate-pulse" />
              <span className="text-white/80 text-sm font-medium">Just Arrived</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">New Arrivals</h1>
            <p className="text-white/80 text-lg">The freshest stock — newly added to our catalogue this week</p>
          </motion.div>
        </div>
      </div>

      {/* Timeline / products */}
      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="flex items-center gap-3 mb-8 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <Clock className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            We add new products every week. Subscribe to our newsletter to never miss a drop.
          </p>
        </div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {newProducts.map((p) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col relative"
              data-testid={`new-product-${p.id}`}
            >
              <div className="absolute top-0 left-0 right-0 z-10 flex justify-between p-2">
                <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> NEW
                </span>
                <span className="text-xs bg-background/80 backdrop-blur text-foreground/70 px-2 py-0.5 rounded-full">
                  {p.daysAgo === 1 ? "Today" : `${p.daysAgo}d ago`}
                </span>
              </div>
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="p-3 flex flex-col flex-1">
                <span className="text-xs text-muted-foreground mb-1">{p.category}</span>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{p.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="flex items-center justify-between mt-auto mb-3">
                  <span className="font-display font-bold text-lg text-foreground">€{p.price.toFixed(2)}</span>
                </div>
                <Button size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" data-testid={`button-new-${p.id}`}>
                  <ShoppingCart className="w-3 h-3" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
