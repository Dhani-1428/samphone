import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  ChevronLeft,
  Headphones,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { FaCcMastercard, FaCcPaypal, FaCcVisa } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import CatalogImage from "@/components/CatalogImage";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";
import { clearTradeInVoucher, loadTradeInVoucher } from "@/lib/trade-in";
import { hideStoreCart } from "@/lib/storefront-preview";
import EmptyCartHero from "@/components/EmptyCartHero";

function CartLineName({ name }: { name: string }) {
  const label = useTranslatedText(name);
  return <>{label}</>;
}

function euro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="#f4f4f5" width="120" height="120"/><path fill="#d4d4d8" d="M40 48h40v24H40z"/></svg>`,
  );

const FREE_SHIP_THRESHOLD = 150;
const STANDARD_SHIPPING = 9.9;
const VAT_RATE = 0.23;

function CartQty({ cartKey }: { cartKey: string }) {
  const { t } = useLang();
  const { getQty, increment, decrement } = useCart();
  const [flash, setFlash] = useState(false);
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const atMax = qty >= maxStock;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center rounded-lg border border-black/[0.12] bg-white">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-[#111111] disabled:opacity-40"
          onClick={() => decrement(cartKey)}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-[#111111]">{qty}</span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-[#111111] disabled:opacity-40"
          onClick={() => increment(cartKey, maxStock)}
          disabled={atMax}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
      <button
        type="button"
        className="text-sm font-medium text-brand hover:underline"
        onClick={() => {
          setFlash(true);
          window.setTimeout(() => setFlash(false), 1200);
        }}
      >
        {flash ? t("cart_updated") : t("cart_update")}
      </button>
    </div>
  );
}

export default function CartPage() {
  const { items, removeLine, totalItems } = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { products: wooProducts } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(wooProducts), [wooProducts]);
  const [tradeIn, setTradeIn] = useState(() => loadTradeInVoucher());

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") === "success") {
      setLocation("/checkout?checkout=success");
    }
  }, [setLocation]);

  const lines = useMemo(() => {
    return Object.entries(items)
      .filter(([, q]) => q > 0)
      .map(([cartKey, qty]) => buildCartLinePreview(cartKey, qty, wooById, user))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, wooById, user]);

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

  const shippingCost = subtotal.sum >= FREE_SHIP_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const vatIncluded = subtotal.sum - subtotal.sum / (1 + VAT_RATE);
  const grandTotal = subtotal.sum + shippingCost;
  const shipProgress = Math.min(100, (subtotal.sum / FREE_SHIP_THRESHOLD) * 100);
  const shipRemain = Math.max(0, FREE_SHIP_THRESHOLD - subtotal.sum);

  if (hideStoreCart()) return <Redirect to="/" />;

  if (lines.length === 0) {
    return <EmptyCartHero />;
  }

  const trust = [
    { Icon: ShieldCheck, title: t("cart_trust_secure"), sub: t("cart_trust_secure_sub") },
    { Icon: Truck, title: t("cart_trust_delivery"), sub: t("cart_trust_delivery_sub") },
    { Icon: RotateCcw, title: t("cart_trust_returns"), sub: t("cart_trust_returns_sub") },
    { Icon: Headphones, title: t("cart_trust_help"), sub: `${t("phone")}\n${t("cart_support_email")}` },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 md:px-8">
        <nav className="mb-5 flex items-center gap-2 text-sm text-[#6b7280]">
          <Link href="/" className="hover:text-brand">
            {t("breadcrumb_home")}
          </Link>
          <span className="text-[#c4c9d4]">›</span>
          <span className="font-medium text-[#111111]">{t("nav_cart")}</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111] md:text-[2rem]">{t("cart_page_title")}</h1>
            <p className="mt-1 text-[15px] text-[#6b7280]">{t("cart_page_sub")}</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-black/[0.12] bg-white px-4 text-sm font-medium text-[#111111] shadow-sm hover:border-brand hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("cart_sider_continue")}
          </Link>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_0.7fr_0.9fr_0.7fr] gap-3 border-b border-black/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa3b2] md:grid">
              <span>{t("cart_col_product")}</span>
              <span>{t("cart_col_price")}</span>
              <span>{t("cart_col_qty")}</span>
              <span className="text-right">{t("cart_col_total")}</span>
            </div>
            <ul>
              {lines.map((line, idx) => (
                <li
                  key={line.cartKey}
                  className={cn(
                    "grid grid-cols-1 gap-4 px-4 py-5 md:grid-cols-[minmax(0,1.6fr)_0.7fr_0.9fr_0.7fr] md:items-center md:gap-3 md:px-5",
                    idx > 0 && "border-t border-black/[0.06]",
                  )}
                >
                  <div className="flex gap-3">
                    <Link href={line.href} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-[#F7F8FA]">
                      <CatalogImage src={line.img ?? PLACEHOLDER} alt="" className="h-full w-full object-contain p-1.5" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={line.href} className="font-semibold leading-snug text-[#111111] hover:text-brand">
                        <CartLineName name={line.name} />
                      </Link>
                      {line.variantLabel ? (
                        <p className="mt-0.5 text-sm text-[#6b7280]">{line.variantLabel}</p>
                      ) : null}
                      {line.sku ? (
                        <p className="mt-0.5 text-xs text-[#9aa3b2]">
                          {t("woo_sku")}: {line.sku}
                        </p>
                      ) : null}
                      <p className={cn("mt-1 text-sm font-medium", line.inStock === false ? "text-amber-600" : "text-emerald-600")}>
                        {line.inStock === false ? t("pdp_out_of_stock") : t("product_in_stock")}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-xs text-[#9aa3b2] hover:text-red-600"
                        onClick={() => removeLine(line.cartKey)}
                      >
                        {t("cart_remove_line")}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-[#111111] md:text-[15px]">
                    <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-[#9aa3b2] md:hidden">
                      {t("cart_col_price")}
                    </span>
                    {line.unitPrice != null ? euro(line.unitPrice) : "—"}
                  </p>
                  <CartQty cartKey={line.cartKey} />
                  <p className="text-right text-sm font-semibold tabular-nums text-[#111111] md:text-[15px]">
                    {line.unitPrice != null ? euro(line.unitPrice * line.qty) : "—"}
                  </p>
                </li>
              ))}
            </ul>
            {shipRemain > 0 ? (
              <div className="border-t border-black/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.8} />
                  <p className="text-sm font-medium text-brand">
                    {t("cart_free_ship_add", { amount: euro(shipRemain) })}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8eefc]">
                  <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${shipProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-[#111111]">{t("cart_order_summary")}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-[#4b5563]">
                <dt>{t("cart_subtotal_items", { count: totalItems })}</dt>
                <dd className="tabular-nums text-[#111111]">{subtotal.missing ? "—" : euro(subtotal.sum)}</dd>
              </div>
              <div className="flex items-center justify-between text-[#4b5563]">
                <dt>{t("cart_shipping")}</dt>
                <dd className="tabular-nums text-[#111111]">{shippingCost === 0 ? t("cart_shipping_free") : euro(shippingCost)}</dd>
              </div>
              <div className="flex items-center justify-between text-[#4b5563]">
                <dt>{t("cart_vat")}</dt>
                <dd className="tabular-nums text-[#111111]">{euro(Math.max(0, vatIncluded))}</dd>
              </div>
            </dl>
            {subtotal.missing ? <p className="mt-2 text-xs text-[#9aa3b2]">{t("cart_subtotal_partial")}</p> : null}
            {tradeIn ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-black/[0.08] bg-[#F7F8FA] px-3 py-2 text-sm">
                <p>
                  {t("trade_code_label")}: <span className="font-mono font-semibold">{tradeIn.code}</span>
                  <span className="ml-2 text-[#6b7280]">{euro(tradeIn.value)}</span>
                </p>
                <button
                  type="button"
                  className="text-xs text-[#9aa3b2] hover:text-red-600"
                  onClick={() => {
                    clearTradeInVoucher();
                    setTradeIn(null);
                  }}
                >
                  {t("cart_remove_line")}
                </button>
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between border-t border-black/[0.08] pt-4">
              <span className="text-base font-bold text-[#111111]">{t("cart_total")}</span>
              <span className="text-xl font-bold tabular-nums text-[#111111]">{subtotal.missing ? "—" : euro(grandTotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#9aa3b2]">{t("cart_vat_note")}</p>

            <Link
              href={user ? "/checkout" : `/login?next=${encodeURIComponent("/checkout")}`}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#243f9f] text-sm font-semibold text-white hover:bg-[#1a327c]"
            >
              {t("cart_checkout_cta")}
            </Link>

            <div className="mt-5 flex items-center gap-2 border-t border-black/[0.06] pt-4">
              <span className="text-xs text-[#9aa3b2]">{t("cart_we_accept")}</span>
              <FaCcVisa className="h-6 w-9 text-[#1a1f71]" title="Visa" />
              <FaCcMastercard className="h-6 w-9 text-[#eb001b]" title="Mastercard" />
              <span className="rounded bg-[#d71f27] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                MB WAY
              </span>
              <FaCcPaypal className="h-6 w-9 text-[#003087]" title="PayPal" />
            </div>
          </aside>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-black/[0.06] bg-white px-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          {trust.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-brand">
                <item.Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#111111]">{item.title}</span>
                <span className="mt-0.5 block whitespace-pre-line text-xs leading-relaxed text-[#6b7280]">{item.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
