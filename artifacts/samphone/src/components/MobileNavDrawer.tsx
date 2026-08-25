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
import AccessoryPageButtons from "@/components/AccessoryPageButtons";
import BrandLogo from "@/components/BrandLogo";
import SmartSearch from "@/components/SmartSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang, LANG_OPTIONS } from "@/contexts/LanguageContext";
import { NAV_OTHER_BRANDS } from "@/data/nav-others";
import type { NavBrandGroup } from "@/lib/woo-category-nav";
import { cn } from "@/lib/utils";

const MODEL_PREVIEW = 5;

const BRAND_ALIASES: Record<string, string[]> = {
  apple: ["apple", "iphone"],
  samsung: ["samsung"],
  xiaomi: ["xiaomi"],
  honor: ["honor"],
  motorola: ["motorola"],
  oneplus: ["oneplus", "one plus"],
  oppo: ["oppo"],
  realme: ["realme"],
  vivo: ["vivo"],
};

function catalogBrandForModelRoutes(partsSlug: string): string {
  const s = partsSlug.toLowerCase();
  if (s === "iphone-parts") return "iphone";
  if (s === "samsung-parts") return "samsung";
  if (s === "honor-parts") return "honor";
  return s.replace(/-parts$/i, "") || s;
}

function slugifyModelLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function findBrandGroup(groups: NavBrandGroup[], slug: string): NavBrandGroup | undefined {
  const keys = (BRAND_ALIASES[slug] ?? [slug]).map((k) => k.toLowerCase());
  return groups.find((g) => {
    const label = g.brand.label.toLowerCase();
    const s = g.brand.slug.toLowerCase();
    return keys.some((k) => label.includes(k) || s.includes(k));
  });
}

function brandHasModelList(
  slug: string,
  browse: "brands" | "others",
  brandGroups: NavBrandGroup[],
) {
  if (browse === "others") {
    return (NAV_OTHER_BRANDS.find((b) => b.slug === slug)?.models.length ?? 0) > 0;
  }
  const group = findBrandGroup(brandGroups, slug);
  if (!group) return false;
  return group.items.some((item) => (item.children?.length ?? 0) > 0) || group.items.length > 0;
}

function DrawerBrandModels({
  browse,
  slug,
  brandGroups,
  onClose,
  seeAllLabel,
}: {
  browse: "brands" | "others";
  slug: string;
  brandGroups: NavBrandGroup[];
  onClose: () => void;
  seeAllLabel: string;
}) {
  if (browse === "others") {
    const brand = NAV_OTHER_BRANDS.find((b) => b.slug === slug);
    if (!brand) return null;
    const preview = brand.models.slice(0, MODEL_PREVIEW);
    const seeAllHref = brand.seeAllHref ?? `/brand/${brand.slug}`;
    return (
      <div className="mb-3 rounded-lg border border-black/[0.08] px-3 py-3 dark:border-white/15">
        <ul className="space-y-2">
          {preview.map((model) => {
            const modelSlug = slugifyModelLabel(model.label);
            return (
              <li key={`${brand.slug}-${modelSlug}`}>
                <Link
                  href={`/model/${brand.slug}/models/${modelSlug}`}
                  onClick={onClose}
                  className="text-[13px] text-[#3d4a5c] dark:text-white/80"
                >
                  {model.label}
                </Link>
              </li>
            );
          })}
          {brand.models.length > MODEL_PREVIEW ? (
            <li>
              <Link
                href={seeAllHref}
                onClick={onClose}
                className="text-[13px] font-semibold text-[#5A73A8]"
              >
                {seeAllLabel}
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  const group = findBrandGroup(brandGroups, slug);
  if (!group) return null;
  const families = group.items.filter((item) => (item.children?.length ?? 0) > 0);
  const brandRoute = catalogBrandForModelRoutes(group.brand.slug);

  if (families.length === 0) {
    const preview = group.items.slice(0, MODEL_PREVIEW);
    return (
      <div className="mb-3 rounded-lg border border-black/[0.08] px-3 py-3 dark:border-white/15">
        <ul className="space-y-2">
          {preview.map((item) => (
            <li key={item.slug}>
              <Link
                href={item.href ?? `/category/${item.slug}`}
                onClick={onClose}
                className="text-[13px] text-[#3d4a5c] dark:text-white/80"
              >
                {item.label}
              </Link>
            </li>
          ))}
          {group.items.length > MODEL_PREVIEW ? (
            <li>
              <Link
                href={`/brand/${slug}`}
                onClick={onClose}
                className="text-[13px] font-semibold text-[#5A73A8]"
              >
                {seeAllLabel}
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-4 rounded-lg border border-black/[0.08] px-3 py-3 dark:border-white/15">
      {families.map((family) => {
        const models = family.children ?? [];
        const preview = models.slice(0, MODEL_PREVIEW);
        return (
          <div key={family.slug}>
            <div className="mb-2 inline-flex rounded-full bg-[#E3EFFA] px-3 py-1 text-[12px] font-medium text-[#1a2b4a] dark:bg-[#1B2436] dark:text-white">
              {family.label}
            </div>
            <ul className="space-y-2">
              {preview.map((model, midx) => (
                <li key={`${family.slug}-${midx}-${model.slug}`}>
                  <Link
                    href={model.href ?? `/model/${brandRoute}/${family.slug}/${model.slug}`}
                    onClick={onClose}
                    className="text-[13px] text-[#3d4a5c] dark:text-white/80"
                  >
                    {model.label}
                  </Link>
                </li>
              ))}
              {models.length > MODEL_PREVIEW ? (
                <li>
                  <Link
                    href={`/model/${brandRoute}/${family.slug}`}
                    onClick={onClose}
                    className="text-[13px] font-semibold text-[#5A73A8]"
                  >
                    {seeAllLabel}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

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
  brandGroups,
}: {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  wishlistCount: number;
  compareCount: number;
  onOpenCart: () => void;
  theme: string;
  onToggleTheme: () => void;
  brandGroups: NavBrandGroup[];
}) {
  const { t, lang, setLang } = useLang();
  const { user, logout } = useAuth();
  const { clearCart } = useCart();
  const [browse, setBrowse] = useState<"brands" | "others">("brands");
  const [showMore, setShowMore] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBrowse("brands");
      setShowMore(false);
      setExpandedSlug(null);
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

        <div className="mb-5">
          <p className="mb-2 inline-flex items-center gap-2 text-[15px] font-bold text-brand-dark dark:text-white">
            <LayoutGrid className="h-4 w-4" />
            {t("nav_all_accessories")}
          </p>
          <AccessoryPageButtons onNavigate={onClose} className="grid grid-cols-2 gap-2 [&>a]:min-w-0 [&>a]:w-full" />
        </div>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("nav_browse_by")}</p>
        <div className="relative mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setBrowse("brands");
              setShowMore(false);
              setExpandedSlug(null);
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
              setExpandedSlug(null);
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
          {visible.map((item) => {
            const expandable = brandHasModelList(item.slug, browse, brandGroups);
            const active = expandedSlug === item.slug;
            const tileClass = cn(
              "flex h-11 items-center justify-center rounded-lg border px-1 text-center text-[12px] font-semibold",
              active
                ? "border-brand-dark bg-brand-dark text-white"
                : "border-black/[0.1] text-brand-dark dark:border-white/15 dark:text-white",
            );
            if (!expandable) {
              return (
                <Link key={item.slug} href={`/brand/${item.slug}`} onClick={onClose} className={tileClass}>
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.slug}
                type="button"
                aria-expanded={active}
                onClick={() => setExpandedSlug(active ? null : item.slug)}
                className={tileClass}
              >
                {item.label}
              </button>
            );
          })}
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
        {expandedSlug ? (
          <DrawerBrandModels
            browse={browse}
            slug={expandedSlug}
            brandGroups={brandGroups}
            onClose={onClose}
            seeAllLabel={t("nav_mega_see_all")}
          />
        ) : null}

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
