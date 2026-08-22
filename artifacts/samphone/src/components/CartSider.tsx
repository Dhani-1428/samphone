import { useMemo } from "react";
import { Link } from "wouter";
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
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import GuestPriceGate from "@/components/GuestPriceGate";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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
  const { items, increment, decrement, removeLine, clearCart, totalItems, isOpen, setCartOpen, closeCart } =
    useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const { products: wooProducts } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(wooProducts), [wooProducts]);

  const lines = useMemo(
    () =>
      Object.entries(items)
        .filter(([, q]) => q > 0)
        .map(([cartKey, qty]) => buildCartLinePreview(cartKey, qty, wooById)),
    [items, wooById],
  );

  const subtotal = useMemo(() => {
    if (!user) return null;
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
  }, [lines, user]);

  const countLabel = t(totalItems === 1 ? "cart_sider_count_one" : "cart_sider_count_many", {
    count: totalItems,
  });

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full w-[min(100%,340px)] max-w-[340px] flex-col gap-0 overflow-hidden border-0 p-0 shadow-[-12px_0_40px_rgba(11,23,54,0.18)]",
          "rounded-none sm:rounded-l-[1.35rem] [&>button.absolute]:hidden",
        )}
      >
        <SheetTitle className="sr-only">{t("cart_sider_title")}</SheetTitle>
        <SheetDescription className="sr-only">{countLabel}</SheetDescription>

        <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0B1736] via-[#122a5c] to-[#1b3d82] px-4 pb-5 pt-4 text-white">
          <ShoppingBag
            className="pointer-events-none absolute -right-3 bottom-0 h-24 w-24 rotate-12 text-white/[0.07]"
            strokeWidth={1.1}
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[1.65rem] font-bold leading-none tracking-tight">
                {t("cart_sider_title")}
              </h2>
              <p className="mt-2 text-[13px] text-white/75">
                {countLabel.split(String(totalItems)).map((part, i, arr) => (
                  <span key={`${part}-${i}`}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="font-semibold text-[#FF6A00]">{totalItems}</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF6A00] px-1 text-[10px] font-bold leading-none text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <PromoArt />
              <p className="mt-4 text-[15px] font-bold text-[#0B1736]">{t("cart_empty_title")}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t("cart_empty_body")}</p>
              <Link
                href="/store"
                onClick={closeCart}
                className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#FF6A00] hover:underline"
              >
                {t("cart_sider_continue")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
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
                        className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d6e4ff] bg-[#eef4ff] text-[#2F6BFF] transition-colors hover:bg-[#dce8ff]"
                        aria-label={t("cart_remove_line")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={line.href}
                        onClick={closeCart}
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
                          onClick={closeCart}
                          className="line-clamp-2 text-[13px] font-bold leading-snug text-[#0B1736] hover:text-[#2F6BFF]"
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
                              className="flex h-7 w-7 items-center justify-center text-[#2F6BFF] disabled:opacity-40"
                              onClick={() => decrement(line.cartKey)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                            <span className="min-w-[1.1rem] text-center text-[12px] font-bold tabular-nums text-[#0B1736]">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center text-[#FF6A00] disabled:opacity-40"
                              onClick={() => {
                                if (!atMax) increment(line.cartKey, maxStock);
                              }}
                              disabled={atMax}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                          </div>
                          {user && line.unitPrice != null && (
                            <span className="text-[14px] font-bold tabular-nums text-[#0B1736]">
                              {formatEuro(line.unitPrice * line.qty)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col items-center px-5 pb-2 pt-4 text-center">
                <PromoArt />
                <p className="mt-3 text-[14px] font-bold leading-snug text-[#0B1736]">
                  {t("cart_sider_looking_good")}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  {t("cart_sider_looking_good_sub")}
                </p>
              </div>
            </>
          )}
        </div>

        {lines.length > 0 && (
          <div className="shrink-0 bg-white">
            <button
              type="button"
              onClick={() => clearCart()}
              className="flex w-full items-center gap-2 border-y border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-[#0B1736] transition-colors hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4 text-[#2F6BFF]" />
              <span className="flex-1">{t("cart_sider_clear")}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <div className="px-4 pb-3 pt-3">
              {!user ? (
                <GuestPriceGate variant="card" />
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-slate-500">{t("cart_subtotal")}</span>
                    <span className="text-[18px] font-bold tabular-nums text-[#0B1736]">
                      {subtotal?.missing ? "—" : formatEuro(subtotal?.sum ?? 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{t("cart_sider_taxes")}</p>

                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#ff8a33] px-2 text-white shadow-[0_8px_18px_rgba(255,106,0,0.28)] transition-opacity hover:opacity-95"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-bold tracking-wide">{t("cart_checkout_cta")}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#FF6A00]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border-2 border-[#FF6A00] px-3 text-[#FF6A00] transition-colors hover:bg-[#fff4ec]"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-[13px] font-bold">{t("cart_sider_review")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <footer className="grid shrink-0 grid-cols-3 gap-1 border-t border-[#d6e8fb] bg-[#e8f3fc] px-2 py-2.5">
          <TrustBadge icon={ShieldCheck} label={t("cart_sider_secure")} />
          <TrustBadge icon={Truck} label={t("cart_sider_delivery")} hint={t("cart_sider_delivery_sub")} />
          <TrustBadge icon={Headset} label={t("cart_sider_support")} hint={t("cart_sider_support_sub")} />
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function PromoArt() {
  return (
    <div className="relative flex h-[88px] w-[88px] items-center justify-center">
      <span className="absolute left-1 top-2 h-1.5 w-1.5 rounded-full bg-[#2F6BFF]/40" />
      <span className="absolute right-2 top-4 h-1 w-1 rounded-full bg-[#FF6A00]/50" />
      <span className="absolute bottom-3 left-3 h-1 w-1 rotate-45 bg-[#2F6BFF]/30" />
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[#e8f1ff] ring-1 ring-[#d6e4ff]">
        <ShoppingBag className="h-9 w-9 text-[#2F6BFF]" strokeWidth={1.5} />
      </div>
    </div>
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
      <Icon className="h-4 w-4 text-[#2F6BFF]" strokeWidth={1.8} />
      <p className="text-[9px] font-bold leading-tight text-[#0B1736]">{label}</p>
      {hint && <p className="text-[8px] leading-tight text-slate-500">{hint}</p>}
    </div>
  );
}
