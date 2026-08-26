import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  Headset,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import GuestPriceGate from "@/components/GuestPriceGate";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import { getStockLevel, isInStock } from "@/data/inventory";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#f1f5f9" width="80" height="80"/><path fill="#cbd5e1" d="M26 32h28v16H26z"/></svg>`,
  );

function formatEuro(value: number) {
  return `${value.toFixed(2).replace(".", ",")}€`;
}

export default function CartSider() {
  const { items, increment, decrement, removeLine, clearCart, totalItems, railVisible } =
    useCart();
  const [location] = useLocation();
  const { t } = useLang();
  const { user } = useAuth();
  const { products: wooProducts } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(wooProducts), [wooProducts]);

  const lines = useMemo(
    () =>
      Object.entries(items)
        .filter(([, q]) => q > 0)
        .map(([cartKey, qty]) => buildCartLinePreview(cartKey, qty, wooById, user)),
    [items, wooById, user],
  );

  const subtotal = useMemo(() => {
    let sum = 0;
    let missing = false;
    for (const line of lines) {
      if (line.unitPrice == null || Number.isNaN(line.unitPrice)) {
        missing = true;
        continue;
      }
      sum += line.unitPrice * line.qty;
    }
    return { sum, missing };
  }, [lines]);

  const countLabel = t(totalItems === 1 ? "cart_sider_count_one" : "cart_sider_count_many", {
    count: totalItems,
  });

  if (!railVisible || lines.length === 0 || location === "/cart") return null;

  return (
    <aside
      id="site-cart-rail"
      aria-label={t("cart_sider_title")}
      className={cn(
        "z-30 w-[min(340px,92vw)] shrink-0 bg-white",
        "max-lg:absolute max-lg:bottom-0 max-lg:right-0 max-lg:top-0 max-lg:shadow-[-12px_0_32px_rgba(15,23,42,0.16)]",
        "lg:relative lg:shadow-none",
      )}
    >
      <div
        className={cn(
          "sticky flex flex-col overflow-hidden border-l border-black/[0.08] bg-white",
          "top-[var(--site-header-h,8rem)] h-[calc(100dvh-var(--site-header-h,8rem))]",
        )}
      >
        <header className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[1.45rem] font-bold leading-none tracking-tight text-[#111111]">
              {t("cart_sider_title")}
            </h2>
            <p className="text-[13px] font-medium text-neutral-500">{countLabel}</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <ul className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const maxStock = getStockLevel(line.cartKey).count;
                  const inStock = isInStock(line.cartKey, line.qty);
                  const atMax = line.qty >= maxStock;
                  return (
                    <li key={line.cartKey} className="flex items-start gap-2 px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => removeLine(line.cartKey)}
                        className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F4F4F4] text-[#111111] transition-colors hover:bg-[#E8E8E8]"
                        aria-label={t("cart_remove_line")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={line.href}
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f1f5f9] ring-1 ring-slate-100"
                      >
                        <img
                          src={line.img ?? PLACEHOLDER}
                          alt=""
                          className="h-full w-full object-contain p-1"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={line.href}
                          className="line-clamp-2 text-[13px] font-bold leading-snug text-[#111111] hover:text-[#111111]"
                        >
                          {line.name}
                        </Link>
                        {inStock && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <Check className="h-3 w-3" strokeWidth={2.6} />
                            {t("product_in_stock")}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white">
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center text-[#111111] disabled:opacity-40"
                              onClick={() => decrement(line.cartKey)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                            <span className="min-w-[1.1rem] text-center text-[12px] font-bold tabular-nums text-[#111111]">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center text-[#111111] disabled:opacity-40"
                              onClick={() => {
                                if (!atMax) increment(line.cartKey, maxStock);
                              }}
                              disabled={atMax}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                          </div>
                          {line.unitPrice != null && (
                            <span className="text-[14px] font-bold tabular-nums text-[#111111]">
                              {formatEuro(line.unitPrice * line.qty)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
        </div>

        <div className="shrink-0 bg-white">
            <button
              type="button"
              onClick={() => clearCart()}
              className="flex w-full items-center gap-2 border-y border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-[#111111] transition-colors hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4 text-[#111111]" />
              <span className="flex-1">{t("cart_sider_clear")}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <div className="px-4 pb-3 pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-slate-500">{t("cart_subtotal")}</span>
                <span className="text-[18px] font-bold tabular-nums text-[#111111]">
                  {subtotal.missing ? "—" : formatEuro(subtotal.sum)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{t("cart_sider_taxes")}</p>
              {!user ? (
                <div className="mt-3">
                  <GuestPriceGate variant="card" />
                </div>
              ) : (
                <>
                  <Link
                    href="/cart"
                    className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-sam px-2 text-white transition-opacity hover:opacity-90"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-bold tracking-wide">{t("cart_checkout_cta")}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#111111]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  <Link
                    href="/cart"
                    className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border-2 border-[#111111] px-3 text-[#111111] transition-colors hover:bg-[#f5f5f5]"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-[13px] font-bold">{t("cart_sider_review")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
        </div>

        <footer className="grid shrink-0 grid-cols-3 gap-1 border-t border-[#d6e8fb] bg-[#e8f3fc] px-2 py-2.5">
          <TrustBadge icon={ShieldCheck} label={t("cart_sider_secure")} />
          <TrustBadge icon={Truck} label={t("cart_sider_delivery")} hint={t("cart_sider_delivery_sub")} />
          <TrustBadge icon={Headset} label={t("cart_sider_support")} hint={t("cart_sider_support_sub")} />
        </footer>
      </div>
    </aside>
  );
}

function TrustBadge({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof ShieldCheck;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-0.5 text-center">
      <Icon className="h-4 w-4 text-[#111111]" strokeWidth={1.8} />
      <p className="text-[9px] font-bold leading-tight text-[#111111]">{label}</p>
      {hint && <p className="text-[8px] leading-tight text-slate-500">{hint}</p>}
    </div>
  );
}
