import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, ChevronDown, Star, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const categories = [
  "All", "Screen Protection", "Cases & Covers", "Chargers", "Cables", "Audio", "Smartwatches", "Hoco Accessories",
];

const products = [
  { id: 1, name: "Full Glue Tempered Glass iPhone 15", price: 6.99, rating: 4.9, reviews: 234, img: productScreen, category: "Screen Protection", badge: "Bestseller" },
  { id: 2, name: "Privacy Glass Samsung S24", price: 8.99, rating: 4.7, reviews: 112, img: productScreen, category: "Screen Protection", badge: null },
  { id: 3, name: "Silicon Soft Jelly Case iPhone 14", price: 9.99, rating: 4.8, reviews: 187, img: productCase, category: "Cases & Covers", badge: "Hot" },
  { id: 4, name: "Antishock Cover Xiaomi 13", price: 11.99, rating: 4.6, reviews: 98, img: productCase, category: "Cases & Covers", badge: null },
  { id: 5, name: "Magsafe Case iPhone 15 Pro", price: 19.99, oldPrice: 29.99, rating: 4.9, reviews: 321, img: productCase, category: "Cases & Covers", badge: "Sale" },
  { id: 6, name: "Type-C 65W Fast Charger", price: 19.99, rating: 4.8, reviews: 204, img: productCharger, category: "Chargers", badge: "New" },
  { id: 7, name: "Wireless Charger 15W Pad", price: 24.99, oldPrice: 34.99, rating: 4.7, reviews: 156, img: productCharger, category: "Chargers", badge: "Sale" },
  { id: 8, name: "Lightning Cable Braided 1m", price: 7.99, rating: 4.8, reviews: 412, img: productCharger, category: "Cables", badge: "Bestseller" },
  { id: 9, name: "Type-C to Type-C Cable 2m", price: 8.99, rating: 4.7, reviews: 178, img: productCharger, category: "Cables", badge: null },
  { id: 10, name: "Wireless Earphones Pro", price: 29.99, oldPrice: 44.99, rating: 4.6, reviews: 89, img: productScreen, category: "Audio", badge: "Sale" },
  { id: 11, name: "Hoco E67 Neck Earphone", price: 14.99, rating: 4.5, reviews: 67, img: productScreen, category: "Audio", badge: null },
  { id: 12, name: "Hoco Power Bank 10000mAh", price: 34.99, rating: 4.8, reviews: 143, img: productCharger, category: "Hoco Accessories", badge: "New" },
];

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Accessories() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Popular");

  const filtered = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="bg-background min-h-screen">
      {/* Page Header */}
      <div className="bg-primary py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-primary-foreground/70 text-sm mb-2">Home / Accessories</p>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Accessories</h1>
            <p className="text-primary-foreground/80 mt-2 text-lg">Premium accessories for every device and lifestyle</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
              }`}
              data-testid={`filter-${cat.toLowerCase().replace(/\s/g, "-")}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">{filtered.length} products found</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 border-border">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer" data-testid="select-sort">
                <option>Popular</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              data-testid={`card-accessory-${p.id}`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {p.badge && (
                  <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[p.badge]}`}>{p.badge}</span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{p.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}</div>
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <span className="font-display font-bold text-foreground">€{p.price.toFixed(2)}</span>
                  {(p as typeof p & { oldPrice?: number }).oldPrice && <span className="text-xs text-muted-foreground line-through">€{(p as typeof p & { oldPrice?: number }).oldPrice?.toFixed(2)}</span>}
                </div>
                <Button size="sm" className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs" data-testid={`button-cart-${p.id}`}>
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
