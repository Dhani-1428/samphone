import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

export default function BackToTopButton() {
  const { t } = useLang();
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
          className="fixed bottom-[5.75rem] right-6 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-white shadow-lg hover:bg-navy md:bottom-[6.75rem] md:right-8"
          aria-label={t("back_to_top")}
          data-testid="button-back-to-top"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
