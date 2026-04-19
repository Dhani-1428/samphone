import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, ShoppingCart, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const brands = [
  { name: "Hoco", logo: "H", color: "from-amber-500 to-orange-600", tagline: "Premium Accessories Brand", items: 120 },
  { name: "Baseus", logo: "B", color: "from-blue-500 to-indigo-600", tagline: "Smart Charging Solutions", items: 95 },
  { name: "Anker", logo: "A", color: "from-green-500 to-emerald-600", tagline: "Charging & Power Experts", items: 78 },
  { name: "Ugreen", logo: "U", color: "from-slate-500 to-slate-700", tagline: "Cables & Connectivity", items: 64 },
  { name: "Joyroom", logo: "J", color: "from-purple-500 to-violet-600", tagline: "Lifestyle Accessories", items: 55 },
  { name: "WK Design", logo: "W", color: "from-rose-500 to-pink-600", tagline: "Designer Covers & Cases", items: 48 },
];

const featured = [
  { id: 1, name: "Hoco Z52 Noise Cancelling Earphones", brand: "Hoco", price: 21.99, oldPrice: 34.99, rating: 4.7, reviews: 134, img: productScreen, badge: "Bestseller" },
  { id: 2, name: "Baseus 100W USB-C Hub 7-in-1", brand: "Baseus", price: 44.99, oldPrice: null, rating: 4.8, reviews: 87, img: productCharger, badge: "New" },
  { id: 3, name: "Anker 733 Power Bank 10000mAh", brand: "Anker", price: 59.99, oldPrice: 79.99, rating: 4.9, reviews: 201, img: productCase, badge: "Sale" },
  { id: 4, name: "Ugreen 2m USB-C Braided Cable", brand: "Ugreen", price: 12.99, oldPrice: null, rating: 4.8, reviews: 312, img: productCharger, badge: null },
  { id: 5, name: "Hoco C96A 20W PD Charger", brand: "Hoco", price: 14.99, oldPrice: 22.99, rating: 4.7, reviews: 178, img: productCharger, badge: "Hot" },
  { id: 6, name: "Joyroom S-UL012A5 iPhone Cable 3m", brand: "Joyroom", price: 9.99, oldPrice: 14.99, rating: 4.6, reviews: 98, img: productCase, badge: "Sale" },
];

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.09 } } };
const itemVariants = { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function MultiBrand() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-white/70 text-sm">Premium Brands Collection</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white">Multi Brand Store</h1>
            <p className="text-white/70 mt-2 text-lg">Top international brands, all in one place — competitive prices guaranteed</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Award, value: "20+", label: "Premium Brands" },
            { icon: TrendingUp, value: "500+", label: "Brand Products" },
            { icon: Star, value: "4.8/5", label: "Average Rating" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-foreground">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Brand selector */}
        <h2 className="text-xl font-display font-bold text-foreground mb-5">Shop by Brand</h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10"
        >
          {brands.map((b) => (
            <motion.button
              key={b.name}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedBrand(selectedBrand === b.name ? null : b.name)}
              className={`rounded-2xl p-4 border-2 transition-all text-left ${selectedBrand === b.name ? "border-primary shadow-lg" : "border-border hover:border-primary/50"}`}
              data-testid={`brand-btn-${b.name.toLowerCase()}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center text-white font-display font-bold text-xl mb-3`}>
                {b.logo}
              </div>
              <p className="font-display font-bold text-foreground text-sm">{b.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{b.items} items</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Featured products */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-bold text-foreground">
            {selectedBrand ? `${selectedBrand} Products` : "Featured Products"}
          </h2>
        </div>
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5"
        >
          {featured.filter((p) => !selectedBrand || p.brand === selectedBrand).map((p) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              data-testid={`multi-product-${p.id}`}
            >
              <div className="aspect-video overflow-hidden bg-muted relative">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {p.badge && (
                  <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[p.badge]}`}>{p.badge}</span>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-foreground/80 text-background text-xs font-bold rounded-full">{p.brand}</div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{p.name}</h3>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <span className="font-display font-bold text-lg text-foreground">€{p.price.toFixed(2)}</span>
                  {p.oldPrice && <span className="text-sm text-muted-foreground line-through">€{p.oldPrice.toFixed(2)}</span>}
                </div>
                <Button size="sm" className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs" data-testid={`button-multi-${p.id}`}>
                  <ShoppingCart className="w-3 h-3" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {(selectedBrand && featured.filter((p) => p.brand === selectedBrand).length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No featured products for {selectedBrand} yet.</p>
            <p className="text-sm mt-2">Check back soon or contact us on WhatsApp.</p>
          </div>
        )}
      </div>
    </div>
  );
}
