import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const products = [
  { id: 1, name: "iPhone 15 Pro Silicone Case", subtitle: "Apple", price: 14.99, oldPrice: 24.99, rating: 4.9, reviews: 312, img: productCase, badge: "Bestseller" },
  { id: 2, name: "USB-C 65W Fast Charger", subtitle: "Universal", price: 19.99, oldPrice: null, rating: 4.8, reviews: 187, img: productCharger, badge: "New" },
  { id: 3, name: "Samsung S24 OLED Screen", subtitle: "Samsung", price: 49.99, oldPrice: 79.99, rating: 4.7, reviews: 95, img: productScreen, badge: "Sale" },
  { id: 4, name: "iPhone 14 Battery Pack", subtitle: "Apple", price: 29.99, oldPrice: 44.99, rating: 4.8, reviews: 203, img: productCase, badge: "Sale" },
  { id: 5, name: "Xiaomi 13 Tempered Glass", subtitle: "Xiaomi", price: 7.99, oldPrice: null, rating: 4.9, reviews: 156, img: productCharger, badge: null },
  { id: 6, name: "Bluetooth Earphones Pro", subtitle: "Generic", price: 24.99, oldPrice: 39.99, rating: 4.6, reviews: 88, img: productScreen, badge: "Hot" },
  { id: 7, name: "Samsung Galaxy A54 Screen", subtitle: "Samsung", price: 39.99, oldPrice: null, rating: 4.7, reviews: 74, img: productCase, badge: null },
  { id: 8, name: "1m Braided USB-C Cable", subtitle: "Universal", price: 5.99, oldPrice: 9.99, rating: 4.8, reviews: 421, img: productCharger, badge: "Bestseller" },
];

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
            <motion.div key={product.id} variants={cardVariants}>
              <ProductCard {...product} testPrefix="home" />
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
