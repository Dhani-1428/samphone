import { motion } from "framer-motion";
import { Star, ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { allSlugs } from "@/data/categories";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const imgPool = [productCase, productCharger, productScreen];

function generateProducts(slug: string, label: string) {
  const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `${label} — Model ${String.fromCharCode(65 + ((seed + i) % 26))}${i + 1}`,
    price: parseFloat((((seed + i * 7) % 80) + 5.99).toFixed(2)),
    oldPrice: i % 3 === 0 ? parseFloat((((seed + i * 7) % 80) + 5.99 + 10).toFixed(2)) : null,
    rating: parseFloat((4.5 + ((i * 0.1) % 0.5)).toFixed(1)),
    reviews: ((seed + i * 13) % 300) + 10,
    img: imgPool[(seed + i) % 3],
    badge: i === 0 ? "Bestseller" : i === 2 ? "New" : i === 5 ? "Sale" : null,
  }));
}

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const meta = allSlugs[slug];
  const label = meta?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const parent = meta?.parent ?? "Accessories";
  const products = generateProducts(slug, label);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-primary py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-3">
              <Link href="/" className="text-primary-foreground/60 text-sm hover:text-primary-foreground transition-colors">Home</Link>
              <span className="text-primary-foreground/40">/</span>
              <span className="text-primary-foreground/60 text-sm">{parent}</span>
              <span className="text-primary-foreground/40">/</span>
              <span className="text-primary-foreground text-sm font-medium">{label}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">{label}</h1>
            <p className="text-primary-foreground/75 mt-2 text-base">{products.length} products available</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <Link href="javascript:history.back()" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-7">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {products.map((p) => (
            <motion.div
              key={p.id}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              data-testid={`cat-product-${p.id}`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.badge && (
                  <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[p.badge]}`}>
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{p.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <span className="font-display font-bold text-foreground">€{p.price.toFixed(2)}</span>
                  {p.oldPrice && (
                    <span className="text-xs text-muted-foreground line-through">€{p.oldPrice.toFixed(2)}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  data-testid={`button-cat-cart-${p.id}`}
                >
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
