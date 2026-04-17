import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.png";

export default function Hero() {
  const scrollToProducts = () => {
    document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
  };
  
  const scrollToCategories = () => {
    document.querySelector("#categories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative min-h-[100dvh] flex items-center pt-20 overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImg} 
          alt="Premium Mobile Accessories" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/70 bg-gradient-to-r from-background/95 via-background/80 to-transparent dark:from-background dark:via-background/90 dark:to-background/40"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-medium">Lisbon's #1 Tech Boutique</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Your Phone. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Your Parts.</span> <br />
            Delivered Fast.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl leading-relaxed"
          >
            Premium accessories and pro-grade repair parts for over <span className="font-semibold text-foreground">700+ device models</span>. Fast delivery across Lisbon and Portugal.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="h-14 px-8 text-base group bg-primary hover:bg-primary/90 text-primary-foreground" onClick={scrollToProducts}>
              <ShoppingBag className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
              Shop Now
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base group bg-background/50 backdrop-blur hover:bg-background/80 border-border" onClick={scrollToCategories}>
              Browse Categories
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-12 flex items-center gap-4"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden z-[${10-i}]`}>
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Customer" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-background bg-primary flex items-center justify-center z-0">
                <span className="text-xs font-bold text-primary-foreground">+2k</span>
              </div>
            </div>
            <div className="text-sm text-foreground/80">
              <p className="font-semibold text-foreground">4.9/5 Rating</p>
              <p>from 600+ happy customers</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
