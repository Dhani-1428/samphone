import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Clock } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const newProducts = [
  { id: 1, name: "iPhone 16 Pro Titanium Case", subtitle: "Apple · Cases", price: 22.99, rating: 4.9, reviews: 12, img: productCase, badge: "New", daysAgo: 1 },
  { id: 2, name: "Samsung S25 Tempered Glass", subtitle: "Samsung · Protection", price: 8.99, rating: 4.8, reviews: 8, img: productScreen, badge: "New", daysAgo: 2 },
  { id: 3, name: "140W GaN Charger (Triple Port)", subtitle: "Generic · Chargers", price: 39.99, rating: 4.7, reviews: 5, img: productCharger, badge: "New", daysAgo: 2 },
  { id: 4, name: "Xiaomi 15 Battery Pack", subtitle: "Xiaomi · Parts", price: 32.99, rating: 4.8, reviews: 14, img: productCase, badge: "New", daysAgo: 3 },
  { id: 5, name: "Pixel 9 Pro Screen Assembly", subtitle: "Google · Parts", price: 94.99, rating: 4.9, reviews: 7, img: productScreen, badge: "New", daysAgo: 4 },
  { id: 6, name: "MagSafe Wallet Case — iPhone 16", subtitle: "Apple · Cases", price: 27.99, rating: 4.8, reviews: 21, img: productCase, badge: "New", daysAgo: 5 },
  { id: 7, name: "USB4 240W Cable 2m", subtitle: "Generic · Cables", price: 16.99, rating: 4.7, reviews: 9, img: productCharger, badge: "New", daysAgo: 6 },
  { id: 8, name: "OnePlus 13 Rear Camera Module", subtitle: "OnePlus · Parts", price: 42.99, rating: 4.6, reviews: 6, img: productScreen, badge: "New", daysAgo: 7 },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } } };

export default function NewArrivals() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div className="bg-background min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 py-12 md:py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-white/10" />
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
            <motion.div key={p.id} variants={itemVariants} className="relative">
              <div className="absolute top-2 right-2 z-30 text-xs bg-background/80 backdrop-blur text-foreground/70 px-2 py-0.5 rounded-full pointer-events-none">
                {p.daysAgo === 1 ? "Today" : `${p.daysAgo}d ago`}
              </div>
              <ProductCard
                {...p}
                testPrefix="new"
                buttonColor="bg-emerald-600 hover:bg-emerald-700 text-white"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
