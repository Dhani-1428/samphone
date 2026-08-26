import { motion } from "framer-motion";
import { SiWhatsapp } from "react-icons/si";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { whatsappChatHref } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export default function WhatsAppButton() {
  const { t } = useLang();
  const { isOpen: cartOpen } = useCart();
  return (
    <motion.a
      href={whatsappChatHref()}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.45, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "fixed bottom-6 z-[60] flex h-14 w-14 items-center justify-center md:bottom-8",
        cartOpen ? "right-6 md:right-[calc(2rem+340px)]" : "right-6 md:right-8",
      )}
      data-testid="button-whatsapp"
      aria-label={`${t("support_chat_whatsapp")} +351 937 119 295`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping" />
      <span className="pointer-events-none absolute -inset-2 rounded-full border-2 border-[#25D366]/40 motion-safe:animate-pulse" />
      <motion.span
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
      >
        <SiWhatsapp className="h-7 w-7" />
      </motion.span>
    </motion.a>
  );
}
