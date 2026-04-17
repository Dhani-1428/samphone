import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Zap, ShoppingCart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const deals = [
  { id: 1, name: "iPhone 14 Screen Replacement", originalPrice: 89.99, salePrice: 59.99, img: productScreen, savings: "33% OFF" },
  { id: 2, name: "Premium Phone Case Bundle (3-Pack)", originalPrice: 39.99, salePrice: 24.99, img: productCase, savings: "38% OFF" },
  { id: 3, name: "65W GaN Charger + 2m Cable Kit", originalPrice: 44.99, salePrice: 27.99, img: productCharger, savings: "38% OFF" },
];

function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, endTime.getTime() - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return timeLeft;
}

export default function Deals() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const endTime = useRef(new Date(Date.now() + 6 * 3600000 + 37 * 60000 + 44000));
  const timeLeft = useCountdown(endTime.current);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section id="deals" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" /> Flash Sale
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Today's Best Deals
          </h2>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-medium">Ends in</span>
            <div className="flex gap-2">
              {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center font-display font-bold text-xl" data-testid={`timer-unit-${i}`}>
                    {unit}
                  </div>
                  {i < 2 && <span className="font-bold text-foreground">:</span>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-5"
        >
          {deals.map((deal, i) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -4 }}
              className="group bg-card border border-border rounded-2xl overflow-hidden"
              data-testid={`card-deal-${deal.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img src={deal.img} alt={deal.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {deal.savings}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-foreground mb-3 leading-snug">{deal.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display font-bold text-2xl text-foreground">€{deal.salePrice.toFixed(2)}</span>
                  <span className="text-muted-foreground line-through text-sm">€{deal.originalPrice.toFixed(2)}</span>
                  <span className="text-red-500 text-sm font-semibold">Save €{(deal.originalPrice - deal.salePrice).toFixed(2)}</span>
                </div>
                <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" data-testid={`button-deal-${deal.id}`}>
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
