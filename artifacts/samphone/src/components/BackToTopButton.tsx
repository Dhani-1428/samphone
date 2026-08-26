import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function BackToTopButton() {
  const { t } = useLang();
  const { isOpen: cartOpen } = useCart();
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 360);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          key="back-to-top"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          onClick={goTop}
          className={cn(
            "fixed bottom-[5.75rem] z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-neutral-800 md:bottom-[6.75rem]",
            cartOpen && location !== "/cart" ? "right-6 md:right-[calc(2rem+340px)]" : "right-6 md:right-8",
          )}
          aria-label={t("back_to_top")}
          data-testid="button-back-to-top"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
