import { motion, useInView } from "framer-motion";
import { useMemo, useRef, useState, useEffect } from "react";
import { Zap, Clock, Loader2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import GuestPriceGate from "@/components/GuestPriceGate";
import { Link } from "wouter";
import { DEAL_PRODUCTS, hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import WooProductCard from "@/components/wc/WooProductCard";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { filterOnSale } from "@/lib/woo-product-filters";

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
  const { user } = useAuth();
  const { lang, t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();

  const deals = useMemo(() => filterOnSale(products).slice(0, 6), [products]);

  const copy =
    lang === "pt"
      ? { flash: "Promo Relampago", title: "Melhores Ofertas de Hoje", ends: "Termina em", save: "Poupe" }
      : { flash: "Flash Sale", title: "Today's Best Deals", ends: "Ends in", save: "Save" };

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
            <Zap className="w-4 h-4" /> {copy.flash}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {copy.title}
          </h2>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-medium">{copy.ends}</span>
            <div className="flex gap-2">
              {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center font-display font-bold text-xl"
                    data-testid={`timer-unit-${i}`}
                  >
                    {unit}
                  </div>
                  {i < 2 && <span className="font-bold text-foreground">:</span>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {woo && loading && deals.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          </div>
        )}

        {woo && !loading && error && <p className="text-center text-sm text-destructive py-8">{error}</p>}

        {woo && deals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-5"
          >
            {deals.map((deal, i) => {
              const reg = Number.parseFloat(deal.regular_price ?? "");
              const price = Number.parseFloat(deal.price ?? "");
              const savingsPct =
                Number.isFinite(reg) && Number.isFinite(price) && reg > price
                  ? Math.round(((reg - price) / reg) * 100)
                  : 0;
              const savingsLabel = `${savingsPct}% OFF`;
              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  whileHover={{ y: -4 }}
                  className="relative"
                  data-testid={`card-deal-${deal.id}`}
                >
                  {savingsPct > 0 && (
                    <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white">
                      {savingsLabel}
                    </div>
                  )}
                  <WooProductCard product={deal} priceUnavailableLabel={t("woo_price_na")} />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {woo && !loading && !error && deals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            {lang === "pt" ? "Sem ofertas com desconto no catálogo neste momento." : "No sale items in the catalog right now."}
          </p>
        )}

        {!woo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-5"
          >
            {DEAL_PRODUCTS.map((deal, i) => {
              const savingsPct = deal.oldPrice
                ? Math.round(((deal.oldPrice - deal.price) / deal.oldPrice) * 100)
                : 0;
              const savingsLabel = `${savingsPct}% OFF`;
              return (
                <motion.div
                  key={deal.cartKey}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  whileHover={{ y: -4 }}
                  className="group bg-card border border-border rounded-2xl overflow-hidden"
                  data-testid={`card-deal-${deal.id}`}
                >
                  <Link href={hrefForCartKey(deal.cartKey)} className="block relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={deal.img}
                      alt={deal.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {savingsLabel}
                    </div>
                  </Link>
                  <div className="p-5">
                    <Link href={hrefForCartKey(deal.cartKey)} className="block">
                      <h3 className="font-semibold text-foreground mb-3 leading-snug hover:text-primary transition-colors">
                        {deal.name}
                      </h3>
                    </Link>
                    {user ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-4 flex-wrap">
                          <span className="font-display font-bold text-2xl text-foreground">€{deal.price.toFixed(2)}</span>
                          {deal.oldPrice != null && (
                            <>
                              <span className="text-muted-foreground line-through text-sm">€{deal.oldPrice.toFixed(2)}</span>
                              <span className="text-red-500 text-sm font-semibold">
                                {copy.save} €{(deal.oldPrice - deal.price).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                        <ProductCartControls cartKey={deal.cartKey} size="md" />
                      </>
                    ) : (
                      <div className="mb-2">
                        <GuestPriceGate variant="card" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
