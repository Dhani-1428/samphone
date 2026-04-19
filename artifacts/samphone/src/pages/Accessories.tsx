import { useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const categories = [
  "All", "Screen Protection", "Cases & Covers", "Chargers", "Cables", "Audio", "Smartwatches", "Hoco Accessories",
];

const products = [
  { id: 1, name: "Full Glue Tempered Glass iPhone 15", price: 6.99, rating: 4.9, reviews: 234, img: productScreen, category: "Screen Protection", badge: "Bestseller", subtitle: "Screen Protection" },
  { id: 2, name: "Privacy Glass Samsung S24", price: 8.99, rating: 4.7, reviews: 112, img: productScreen, category: "Screen Protection", badge: null, subtitle: "Screen Protection" },
  { id: 3, name: "Silicon Soft Jelly Case iPhone 14", price: 9.99, rating: 4.8, reviews: 187, img: productCase, category: "Cases & Covers", badge: "Hot", subtitle: "Cases & Covers" },
  { id: 4, name: "Antishock Cover Xiaomi 13", price: 11.99, rating: 4.6, reviews: 98, img: productCase, category: "Cases & Covers", badge: null, subtitle: "Cases & Covers" },
  { id: 5, name: "Magsafe Case iPhone 15 Pro", price: 19.99, oldPrice: 29.99, rating: 4.9, reviews: 321, img: productCase, category: "Cases & Covers", badge: "Sale", subtitle: "Cases & Covers" },
  { id: 6, name: "Type-C 65W Fast Charger", price: 19.99, rating: 4.8, reviews: 204, img: productCharger, category: "Chargers", badge: "New", subtitle: "Chargers" },
  { id: 7, name: "Wireless Charger 15W Pad", price: 24.99, oldPrice: 34.99, rating: 4.7, reviews: 156, img: productCharger, category: "Chargers", badge: "Sale", subtitle: "Chargers" },
  { id: 8, name: "Lightning Cable Braided 1m", price: 7.99, rating: 4.8, reviews: 412, img: productCharger, category: "Cables", badge: "Bestseller", subtitle: "Cables" },
  { id: 9, name: "Type-C to Type-C Cable 2m", price: 8.99, rating: 4.7, reviews: 178, img: productCharger, category: "Cables", badge: null, subtitle: "Cables" },
  { id: 10, name: "Wireless Earphones Pro", price: 29.99, oldPrice: 44.99, rating: 4.6, reviews: 89, img: productScreen, category: "Audio", badge: "Sale", subtitle: "Audio" },
  { id: 11, name: "Hoco E67 Neck Earphone", price: 14.99, rating: 4.5, reviews: 67, img: productScreen, category: "Audio", badge: null, subtitle: "Audio" },
  { id: 12, name: "Hoco Power Bank 10000mAh", price: 34.99, rating: 4.8, reviews: 143, img: productCharger, category: "Hoco Accessories", badge: "New", subtitle: "Hoco Accessories" },
];

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
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary hover:text-primary"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">{filtered.length} products found</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 border-border">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer">
                <option>Popular</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {filtered.map((p) => (
            <motion.div key={p.id} variants={cardVariants}>
              <ProductCard {...p} testPrefix="acc" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
