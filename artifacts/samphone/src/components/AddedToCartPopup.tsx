import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CatalogImage from "@/components/CatalogImage";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import { fetchCloudProductByWcId } from "@/lib/samphone-cloud";
import { getPrimaryImageUrl } from "@/lib/woocommerce";
import { hrefForCartKey } from "@/data/catalog";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#f1f5f9" width="80" height="80"/><path fill="#cbd5e1" d="M26 32h28v16H26z"/></svg>`,
  );

const AUTO_HIDE_MS = 5200;

export default function AddedToCartPopup() {
  const { lastAdded, dismissAdded, railVisible } = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const { products } = useProductCatalog();
  const [location] = useLocation();
  const [fetched, setFetched] = useState<{ name: string; img: string | null } | null>(null);

  const wooById = useMemo(() => buildWooProductMap(products), [products]);

  const catalogLine = useMemo(() => {
    if (!lastAdded) return null;
    return buildCartLinePreview(lastAdded.cartKey, 1, wooById, user);
  }, [lastAdded, wooById, user]);

  const name =
    lastAdded?.name?.trim() ||
    fetched?.name ||
    catalogLine?.name ||
    "";
  const img =
    lastAdded?.img ||
    fetched?.img ||
    catalogLine?.img ||
    null;
  const href = lastAdded ? hrefForCartKey(lastAdded.cartKey) : "/cart";

  useEffect(() => {
    if (!lastAdded) return;
    const timer = window.setTimeout(() => dismissAdded(), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [lastAdded?.nonce, dismissAdded, lastAdded]);

  useEffect(() => {
    setFetched(null);
    if (!lastAdded?.cartKey.startsWith("woo:")) return;
    const addedName = lastAdded.name?.trim() ?? "";
    const hasName = addedName.length > 0 && !addedName.startsWith("Product #");
    if (hasName && lastAdded.img) return;
    const id = Number(lastAdded.cartKey.slice(4));
    if (!Number.isFinite(id) || id <= 0) return;
    let alive = true;
    void fetchCloudProductByWcId(id)
      .then((p) => {
        if (!alive || !p) return;
        setFetched({ name: p.name, img: getPrimaryImageUrl(p) });
      })
      .catch(() => {
        /* keep catalog fallback */
      });
    return () => {
      alive = false;
    };
  }, [lastAdded]);

  if (location === "/cart") return null;

  return (
    <AnimatePresence>
      {lastAdded ? (
        <motion.div
          key={lastAdded.nonce}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={cn(
            "fixed z-[80] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]",
            "bottom-6 left-3 sm:bottom-8 sm:left-6",
            railVisible && location !== "/cart" ? "max-lg:bottom-[5.5rem]" : "",
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#111111]">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {t("cart_added_title")}
            </p>
            <button
              type="button"
              onClick={dismissAdded}
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label={t("cart_added_close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={href}
              onClick={dismissAdded}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F3F4F6]"
            >
              <CatalogImage
                src={img || PLACEHOLDER}
                alt={name}
                className="h-full w-full object-contain p-1"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                onClick={dismissAdded}
                className="line-clamp-2 text-sm font-semibold leading-snug text-[#111111] hover:underline"
              >
                {name || t("cart_added_title")}
              </Link>
              <Link
                href="/cart"
                onClick={dismissAdded}
                className="mt-1.5 inline-flex text-[13px] font-bold text-[#2563EB] hover:underline"
              >
                {t("cart_added_view")}
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
