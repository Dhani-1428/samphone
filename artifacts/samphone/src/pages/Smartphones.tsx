import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const brands = [
  { name: "iPhone Parts", img: productScreen, count: "180+ parts", color: "from-gray-700 to-gray-900" },
  { name: "Samsung Parts", img: productCase, count: "220+ parts", color: "from-blue-700 to-blue-900" },
  { name: "Xiaomi Parts", img: productCharger, count: "140+ parts", color: "from-orange-600 to-red-700" },
  { name: "Oppo Reno Parts", img: productScreen, count: "90+ parts", color: "from-green-700 to-emerald-900" },
  { name: "Realme Parts", img: productCase, count: "80+ parts", color: "from-yellow-600 to-orange-700" },
  { name: "Huawei Parts", img: productCharger, count: "110+ parts", color: "from-red-700 to-rose-900" },
  { name: "One Plus Parts", img: productScreen, count: "70+ parts", color: "from-red-600 to-red-900" },
  { name: "Motorola Parts", img: productCase, count: "60+ parts", color: "from-indigo-700 to-indigo-900" },
  { name: "Alcatel Parts", img: productCharger, count: "40+ parts", color: "from-teal-700 to-teal-900" },
  { name: "Google Pixel Parts", img: productScreen, count: "55+ parts", color: "from-blue-600 to-cyan-700" },
  { name: "Nokia Parts", img: productCase, count: "45+ parts", color: "from-sky-700 to-sky-900" },
  { name: "Repair Tools", img: productCharger, count: "30+ items", color: "from-slate-600 to-slate-800" },
];

const parts = [
  { id: 1, name: "iPhone 15 Pro OLED Display", subtitle: "Apple · Screen", price: 89.99, rating: 4.9, reviews: 67, img: productScreen, badge: null },
  { id: 2, name: "Samsung S24 Ultra Screen Assembly", subtitle: "Samsung · Screen", price: 79.99, rating: 4.8, reviews: 43, img: productScreen, badge: null },
  { id: 3, name: "iPhone 14 Battery 3279mAh", subtitle: "Apple · Battery", price: 28.99, rating: 4.8, reviews: 201, img: productCase, badge: "Bestseller" },
  { id: 4, name: "Xiaomi 13 Charging Port", subtitle: "Xiaomi · Port", price: 14.99, rating: 4.6, reviews: 88, img: productCharger, badge: null },
  { id: 5, name: "Samsung A54 Back Cover", subtitle: "Samsung · Housing", price: 19.99, rating: 4.7, reviews: 112, img: productCase, badge: null },
  { id: 6, name: "iPhone 13 Front Camera Module", subtitle: "Apple · Camera", price: 34.99, rating: 4.7, reviews: 56, img: productScreen, badge: "New" },
  { id: 7, name: "Huawei P60 Battery", subtitle: "Huawei · Battery", price: 24.99, rating: 4.6, reviews: 74, img: productCase, badge: null },
  { id: 8, name: "OnePlus 12 USB-C Port Flex", subtitle: "OnePlus · Port", price: 12.99, rating: 4.5, reviews: 39, img: productCharger, badge: null },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Smartphones() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-foreground py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-background/60 text-sm mb-2">Home / Smartphones</p>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-background">Smartphone Parts</h1>
            <p className="text-background/70 mt-2 text-lg">Genuine-quality replacement parts for 700+ device models</p>
          </motion.div>
        </div>
      </div>

      <div className="bg-muted/30 py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Select Your Brand</h2>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="Search brand..." className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {brands.map((b) => (
              <motion.button
                key={b.name}
                variants={itemVariants}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(selected === b.name ? null : b.name)}
                className={`rounded-2xl overflow-hidden border-2 transition-all ${selected === b.name ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"}`}
              >
                <div className={`relative aspect-square bg-gradient-to-br ${b.color} flex items-center justify-center overflow-hidden`}>
                  <img src={b.img} alt={b.name} className="w-full h-full object-cover opacity-30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <span className="text-white font-display font-bold text-xs md:text-sm text-center leading-tight">{b.name}</span>
                    <span className="text-white/70 text-xs mt-1">{b.count}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          {selected ? `${selected} — Available Parts` : "Featured Parts"}
        </h2>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {parts.map((p) => (
            <motion.div key={p.id} variants={itemVariants}>
              <ProductCard {...p} testPrefix="phone" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
