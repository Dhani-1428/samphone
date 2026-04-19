import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ShoppingCart, Search, Cpu, Battery, Monitor, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import productScreen from "@/assets/product-screen.png";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";

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
  { id: 1, name: "iPhone 15 Pro OLED Display", brand: "Apple", type: "Screen", price: 89.99, rating: 4.9, reviews: 67, img: productScreen },
  { id: 2, name: "Samsung S24 Ultra Screen Assembly", brand: "Samsung", type: "Screen", price: 79.99, rating: 4.8, reviews: 43, img: productScreen },
  { id: 3, name: "iPhone 14 Battery 3279mAh", brand: "Apple", type: "Battery", price: 28.99, rating: 4.8, reviews: 201, img: productCase },
  { id: 4, name: "Xiaomi 13 Charging Port", brand: "Xiaomi", type: "Charging Port", price: 14.99, rating: 4.6, reviews: 88, img: productCharger },
  { id: 5, name: "Samsung A54 Back Cover", brand: "Samsung", type: "Housing", price: 19.99, rating: 4.7, reviews: 112, img: productCase },
  { id: 6, name: "iPhone 13 Front Camera Module", brand: "Apple", type: "Camera", price: 34.99, rating: 4.7, reviews: 56, img: productScreen },
  { id: 7, name: "Huawei P60 Battery", brand: "Huawei", type: "Battery", price: 24.99, rating: 4.6, reviews: 74, img: productCase },
  { id: 8, name: "OnePlus 12 USB-C Port Flex", brand: "OnePlus", type: "Charging Port", price: 12.99, rating: 4.5, reviews: 39, img: productCharger },
];

const typeIcons: Record<string, typeof Monitor> = {
  Screen: Monitor, Battery: Battery, "Charging Port": Cpu, Camera: Camera, Housing: Monitor,
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Smartphones() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-foreground py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-background/60 text-sm mb-2">Home / Smartphones</p>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-background">Smartphone Parts</h1>
            <p className="text-background/70 mt-2 text-lg">Genuine-quality replacement parts for 700+ device models</p>
          </motion.div>
        </div>
      </div>

      {/* Brand grid */}
      <div className="bg-muted/30 py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Select Your Brand</h2>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="Search brand..." className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4"
          >
            {brands.map((b) => (
              <motion.button
                key={b.name}
                variants={itemVariants}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(selected === b.name ? null : b.name)}
                className={`rounded-2xl overflow-hidden border-2 transition-all ${selected === b.name ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"}`}
                data-testid={`brand-${b.name.toLowerCase().replace(/\s/g, "-")}`}
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

      {/* Parts list */}
      <div className="container mx-auto px-4 md:px-6 py-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
          {selected ? `${selected} — Available Parts` : "Featured Parts"}
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {parts.map((p) => {
            const Icon = typeIcons[p.type] || Monitor;
            return (
              <motion.div key={p.id} variants={itemVariants} whileHover={{ y: -4 }} className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col" data-testid={`part-card-${p.id}`}>
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{p.type}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{p.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}
                    <span className="text-xs text-muted-foreground">({p.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto mb-3">
                    <span className="font-display font-bold text-lg text-foreground">€{p.price.toFixed(2)}</span>
                  </div>
                  <Button size="sm" className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs" data-testid={`button-part-${p.id}`}>
                    <ShoppingCart className="w-3 h-3" /> Add to Cart
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
