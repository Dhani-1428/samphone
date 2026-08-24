import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Heart,
  LayoutGrid,
  Moon,
  Phone,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  Sun,
  User,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SmartSearch from "@/components/SmartSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang, LANG_OPTIONS } from "@/contexts/LanguageContext";
import { NAV_OTHER_BRANDS } from "@/data/nav-others";
import { cn } from "@/lib/utils";

const PRIMARY_BRANDS = [
  { label: "Apple", slug: "apple" },
  { label: "Samsung", slug: "samsung" },
  { label: "Xiaomi", slug: "xiaomi" },
  { label: "Honor", slug: "honor" },
  { label: "Motorola", slug: "motorola" },
  { label: "OnePlus", slug: "oneplus" },
  { label: "Oppo", slug: "oppo" },
  { label: "Realme", slug: "realme" },
  { label: "Vivo", slug: "vivo" },
] as const;

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sam px-0.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function MobileNavDrawer({
  open,
  onClose,
  cartCount,
  wishlistCount,
  compareCount,
  onOpenCart,
  theme,
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  wishlistCount: number;
  compareCount: number;
  onOpenCart: () => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const { t, lang, setLang } = useLang();
  const { user, logout } = useAuth();
  const { clearCart } = useCart();
  const [browse, setBrowse] = useState<"brands" | "others">("brands");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!open) {
      setBrowse("brands");
      setShowMore(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const otherBrands = NAV_OTHER_BRANDS.map((b) => ({ label: b.name, slug: b.slug }));
  const brandItems = browse === "brands" ? [...PRIMARY_BRANDS] : otherBrands;
  const visible = showMore ? brandItems : brandItems.slice(0, 8);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-white text-brand-dark dark:bg-[#12192A] dark:text-white xl:hidden" role="dialog" aria-modal="true" aria-label={t("header_menu")}>
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center text-brand-dark dark:text-white" aria-label="Close">
          <X className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <BrandLogo className="h-8 w-auto" onClick={onClose} />
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center text-brand-dark dark:text-white"
          onClick={() => {
            onClose();
            onOpenCart();
          }}
          aria-label={t("nav_cart")}
        >
          <ShoppingBag className="h-6 w-6" strokeWidth={1.7} />
          <CountBadge count={cartCount} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="mb-3">
          <SmartSearch
            variant="header"
            hideButton
            leadingIcon
            placeholder={t("search_products_brands")}
            className="h-11 rounded-lg border border-black/[0.12] bg-white dark:border-white/15 dark:bg-[#1B2436]"
          />
        </div>

        <Link
          href="/accessories"
          onClick={onClose}
          className="mb-5 flex h-12 w-full items-center justify-between rounded-lg bg-sam px-4 text-white"
        >
          <span className="inline-flex items-center gap-2 text-[15px] font-bold">
            <LayoutGrid className="h-4 w-4" />
            {t("nav_all_accessories")}
          </span>
          <ChevronRight className="h-5 w-5" />
        </Link>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("nav_browse_by")}</p>
        <div className="relative mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setBrowse("brands");
              setShowMore(false);
            }}
            className={cn(
              "relative h-10 rounded-lg text-[14px] font-bold",
              browse === "brands" ? "bg-brand-dark text-white" : "border border-brand-dark text-brand-dark",
            )}
          >
            {t("nav_brands")}
            {browse === "brands" ? (
              <span className="absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-brand-dark" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setBrowse("others");
              setShowMore(false);
            }}
            className={cn(
              "relative h-10 rounded-lg text-[14px] font-bold",
              browse === "others" ? "bg-brand-dark text-white" : "border border-brand-dark text-brand-dark",
            )}
          >
            {t("nav_bar_others")}
            {browse === "others" ? (
              <span className="absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-brand-dark" />
            ) : null}
          </button>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {visible.map((item) => (
            <Link
              key={item.slug}
              href={`/brand/${item.slug}`}
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-lg border border-black/[0.1] px-1 text-center text-[12px] font-semibold text-brand-dark dark:border-white/15 dark:text-white"
            >
              {item.label}
            </Link>
          ))}
          {brandItems.length > 8 && !showMore ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="flex h-11 items-center justify-center gap-1 rounded-lg border border-black/[0.1] text-[12px] font-semibold text-brand-dark dark:border-white/15 dark:text-white"
            >
              {t("nav_more_brands")}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <Link
          href="/multi-brand"
          onClick={onClose}
          className="mb-2 flex h-12 items-center justify-between rounded-lg bg-[#E8EEF7] px-4 text-brand-dark dark:bg-[#1B2436] dark:text-white"
        >
          <span className="inline-flex items-center gap-2 text-[14px] font-bold">
            <LayoutGrid className="h-4 w-4" />
            {t("nav_view_all_brands")}
          </span>
          <ChevronRight className="h-5 w-5" />
        </Link>

        <Link href="/wishlist" onClick={onClose} className="flex h-12 items-center justify-between border-b border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
          <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
            <span className="relative">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 ? <CountBadge count={wishlistCount} /> : null}
            </span>
            {t("wishlist")}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link href="/compare" onClick={onClose} className="flex h-12 items-center justify-between border-b border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
          <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
            <span className="relative">
              <Repeat2 className="h-5 w-5" />
              {compareCount > 0 ? <CountBadge count={compareCount} /> : null}
            </span>
            {t("compare")}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <a href="tel:+351937119295" className="flex h-12 items-center justify-between border-b border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
          <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
            <Phone className="h-5 w-5" />
            {t("phone")}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>

        <div className="flex h-12 items-center justify-between border-b border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
          <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {t("nav_dark_mode")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={onToggleTheme}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              theme === "dark" ? "bg-brand-dark" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
                theme === "dark" ? "left-5" : "left-0.5",
              )}
            />
          </button>
        </div>

        <label className="flex h-12 w-full items-center justify-between text-brand-dark dark:text-white">
          <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
            <Globe className="h-5 w-5" />
            {LANG_OPTIONS.find((o) => o.id === lang)?.label ?? lang}
          </span>
          <select
            className="bg-transparent text-sm outline-none"
            value={lang}
            onChange={(e) => setLang(e.target.value as (typeof LANG_OPTIONS)[number]["id"])}
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {user ? (
          <>
            <Link href="/account" onClick={onClose} className="flex h-12 items-center justify-between border-t border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
              <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
                <User className="h-5 w-5" />
                {t("auth_my_account")}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={() => {
                clearCart();
                logout();
                onClose();
              }}
              className="flex h-12 w-full items-center justify-between text-brand-dark dark:text-white"
            >
              <span className="text-[14px] font-semibold">{t("auth_logout")}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </>
        ) : (
          <Link href="/login" onClick={onClose} className="flex h-12 items-center justify-between border-t border-black/[0.06] text-brand-dark dark:border-white/10 dark:text-white">
            <span className="inline-flex items-center gap-3 text-[14px] font-semibold">
              <User className="h-5 w-5" />
              {t("login")}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        )}

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#E8EEF7] px-4 py-3 dark:bg-[#1B2436]">
          <ShieldCheck className="h-8 w-8 shrink-0 text-brand-dark dark:text-white" />
          <div>
            <p className="text-[14px] font-bold text-brand-dark dark:text-white">{t("nav_secure_shopping")}</p>
            <p className="text-[12px] text-brand-dark/70 dark:text-white/70">{t("nav_secure_shopping_sub")}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
