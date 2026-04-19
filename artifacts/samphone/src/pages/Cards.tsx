import { motion } from "framer-motion";
import { Zap, HardDrive, CreditCard } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { allBrands } from "@/data/brands";
import productCharger from "@/assets/product-charger.png";
import productCase from "@/assets/product-case.png";
import productScreen from "@/assets/product-screen.png";

const cardTypes = [
  { icon: HardDrive, label: "MicroSD Cards", desc: "For phones, tablets, drones & cameras", color: "bg-blue-500/10 text-blue-600" },
  { icon: HardDrive, label: "SD Cards", desc: "Standard SD for cameras and devices", color: "bg-indigo-500/10 text-indigo-600" },
  { icon: CreditCard, label: "SIM Adapters", desc: "Nano, Micro, and Standard SIM adapters", color: "bg-emerald-500/10 text-emerald-600" },
  { icon: Zap, label: "High-Speed UHS", desc: "Ultra High Speed cards for professionals", color: "bg-amber-500/10 text-amber-600" },
];

const products = [
  { id: 1, name: "Samsung MicroSD 128GB Class 10", subtitle: "Samsung · 100MB/s", price: 14.99, oldPrice: 24.99, rating: 4.9, reviews: 312, img: productCharger, badge: "Sale" },
  { id: 2, name: "SanDisk Ultra 256GB MicroSD", subtitle: "SanDisk · 120MB/s", price: 24.99, rating: 4.8, reviews: 201, img: productCase, badge: null },
  { id: 3, name: "Kingston Canvas Select 64GB", subtitle: "Kingston · 80MB/s", price: 9.99, oldPrice: 14.99, rating: 4.7, reviews: 178, img: productScreen, badge: "Sale" },
  { id: 4, name: "Lexar 32GB SD Card UHS-I", subtitle: "Lexar · 95MB/s", price: 11.99, rating: 4.6, reviews: 89, img: productCharger, badge: null },
  { id: 5, name: "SIM Tray Adapter Set", subtitle: "Generic · Universal", price: 3.99, oldPrice: 6.99, rating: 4.8, reviews: 423, img: productCase, badge: "Bestseller" },
  { id: 6, name: "Samsung PRO Plus 512GB MicroSD", subtitle: "Samsung · 160MB/s", price: 49.99, oldPrice: 69.99, rating: 4.9, reviews: 145, img: productScreen, badge: "Sale" },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function CardsHeader() {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-32 px-4 md:px-6">
      <p className="text-foreground/50 text-sm mb-3 uppercase tracking-widest">Home / Cards</p>
      <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-4">Memory & SIM Cards</h1>
      <p className="text-foreground/60 text-xl max-w-xl">Expand your storage. Keep your connections. Scroll to explore brands.</p>
    </div>
  );
}

export default function Cards() {
  return (
    <div className="bg-background">
      <HeroParallax brands={allBrands} header={<CardsHeader />} compact />

      <div className="container mx-auto px-4 md:px-6 py-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {cardTypes.map((ct) => (
            <motion.div key={ct.label} variants={itemVariants} whileHover={{ y: -4 }} className="p-5 bg-card border border-border rounded-2xl cursor-pointer hover:border-primary/40 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${ct.color}`}><ct.icon className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-foreground text-sm mb-1">{ct.label}</h3>
              <p className="text-muted-foreground text-xs">{ct.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-10 flex flex-col md:flex-row items-center gap-4">
          <Zap className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h3 className="font-display font-bold text-foreground mb-1">How to choose the right speed class?</h3>
            <p className="text-muted-foreground text-sm">Class 10 / UHS-I for everyday use. UHS-II for 4K video and professional photography. Chat with us on WhatsApp for help.</p>
          </div>
        </motion.div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-6">All Memory Cards</h2>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {products.map((p) => (
            <motion.div key={p.id} variants={itemVariants}><ProductCard {...p} testPrefix="card" /></motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
