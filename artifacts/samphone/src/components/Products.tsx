import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const products = [
  { id: 1, name: "iPhone 15 Pro Silicone Case", brand: "Apple", price: 14.99, oldPrice: 24.99, rating: 4.9, reviews: 312, img: productCase, badge: "Bestseller", category: "Cases" },
  { id: 2, name: "USB-C 65W Fast Charger", brand: "Universal", price: 19.99, oldPrice: null, rating: 4.8, reviews: 187, img: productCharger, badge: "New", category: "Chargers" },
  { id: 3, name: "Samsung S24 OLED Screen", brand: "Samsung", price: 49.99, oldPrice: 79.99, rating: 4.7, reviews: 95, img: productScreen, badge: "Sale", category: "Parts" },
  { id: 4, name: "iPhone 14 Battery Pack", brand: "Apple", price: 29.99, oldPrice: 44.99, rating: 4.8, reviews: 203, img: productCase, badge: "Sale", category: "Parts" },
  { id: 5, name: "Xiaomi 13 Tempered Glass", brand: "Xiaomi", price: 7.99, oldPrice: null, rating: 4.9, reviews: 156, img: productCharger, badge: null, category: "Protection" },
  { id: 6, name: "Bluetooth Earphones Pro", brand: "Generic", price: 24.99, oldPrice: 39.99, rating: 4.6, reviews: 88, img: productScreen, badge: "Hot", category: "Audio" },
  { id: 7, name: "Samsung Galaxy A54 Screen", brand: "Samsung", price: 39.99, oldPrice: null, rating: 4.7, reviews: 74, img: productCase, badge: null, category: "Parts" },
  { id: 8, name: "1m Braided USB-C Cable", brand: "Universal", price: 5.99, oldPrice: 9.99, rating: 4.8, reviews: 421, img: productCharger, badge: "Bestseller", category: "Cables" },
];

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function Products() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [wishlisted, setWishlisted] = useState<number[]>([]);

  const toggleWishlist = (id: number) => {
    setWishlisted((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <section id="products" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Popular Products
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Top Picks This Week
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Thousands of products. Competitive prices. Shipped fast from Lisbon.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="group relative bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              data-testid={`card-product-${product.id}`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={product.img}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {product.badge && (
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full ${badgeColors[product.badge]}`}>
                    {product.badge}
                  </span>
                )}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  data-testid={`button-wishlist-${product.id}`}
                >
                  <Heart className={`w-4 h-4 ${wishlisted.includes(product.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                </button>
              </div>

              <div className="p-3 md:p-4 flex flex-col flex-1">
                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                <h3 className="font-semibold text-foreground text-sm leading-tight mb-2 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-1 mb-3">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <span className="font-display font-bold text-foreground text-lg">€{product.price.toFixed(2)}</span>
                  {product.oldPrice && (
                    <span className="text-sm text-muted-foreground line-through">€{product.oldPrice.toFixed(2)}</span>
                  )}
                </div>
                <Button size="sm" className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" data-testid={`button-add-cart-${product.id}`}>
                  <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Button size="lg" variant="outline" className="px-10 border-border hover:bg-muted">
            View All Products
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
