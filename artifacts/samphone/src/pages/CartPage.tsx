import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GuestPriceGate from "@/components/GuestPriceGate";
import CatalogImage from "@/components/CatalogImage";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import {
  CHECKOUT_DRAFT_KEY,
  createCloudOrder,
  startStripeCheckout,
  type CheckoutDraft,
} from "@/lib/samphone-cloud";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";
import { clearTradeInVoucher, loadTradeInVoucher } from "@/lib/trade-in";
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
  const { items, removeLine, clearCart, totalItems } = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const { products: wooProducts } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(wooProducts), [wooProducts]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutOk, setCheckoutOk] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lisboa");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("Portugal");
  const [companyName, setCompanyName] = useState(user?.businessName ?? "");
  const [vatNumber, setVatNumber] = useState(user?.vatNumber ?? "");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState("standard");
  const [payMethod, setPayMethod] = useState("card");
  const [tradeIn, setTradeIn] = useState(() => loadTradeInVoucher());

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

  const shippingCost = shipping === "pickup" || subtotal.sum >= FREE_SHIP_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const vatIncluded = subtotal.sum - subtotal.sum / (1 + VAT_RATE);
  const grandTotal = subtotal.sum + shippingCost;
  const shipProgress = Math.min(100, (subtotal.sum / FREE_SHIP_THRESHOLD) * 100);
  const shipRemain = Math.max(0, FREE_SHIP_THRESHOLD - subtotal.sum);

  const handleCheckout = async () => {
    const payload = lines
      .filter((line) => line.productId && line.qty > 0)
      .map((line) => ({ productId: line.productId as string, quantity: line.qty }));
    if (payload.length === 0) {
      setCheckoutError(t("cart_checkout_note"));
      return;
    }
    if (!user) {
      setCheckoutError(t("login_to_buy"));
      return;
    }
    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim() || !postal.trim() || !country.trim()) {
      setCheckoutError(t("checkout_full_name"));
      return;
    }
    const isBiz = (user.accountType || "").toLowerCase() === "b2b";
    if (isBiz && (!companyName.trim() || !vatNumber.trim())) {
      setCheckoutError(t("checkout_company"));
      return;
    }
    const moqFail = lines.find((line) => line.minOrderQty && line.qty < line.minOrderQty);
    if (moqFail) {
      setCheckoutError(t("moq_error", { qty: String(moqFail.minOrderQty), name: moqFail.name }));
      return;
    }
    const tradeNote = tradeIn ? `Trade-in ${tradeIn.code} (€${tradeIn.value})` : "";
    const draft: CheckoutDraft = {
      items: payload,
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      postal_code: postal.trim(),
      country: country.trim(),
      company_name: isBiz ? companyName.trim() : undefined,
      vat_number: isBiz ? vatNumber.trim() : undefined,
      shipping_method: shipping,
      payment_method: payMethod,
      notes: [notes.trim(), tradeNote].filter(Boolean).join("\n"),
    };
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const stripePay =
        payMethod === "card" ||
        payMethod === "mb_way" ||
        payMethod === "multibanco" ||
        payMethod === "google_pay" ||
        payMethod === "apple_pay";
      if (stripePay) {
        sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
        const url = await startStripeCheckout(payload);
        window.location.assign(url);
        return;
      }
      await createCloudOrder({
        items: payload.map((row) => ({ product_id: row.productId, quantity: row.quantity })),
        full_name: draft.full_name,
        phone: draft.phone,
        address: draft.address,
        city: draft.city,
        postal_code: draft.postal_code,
        country: draft.country,
        company_name: draft.company_name,
        vat_number: draft.vat_number,
        payment_method: payMethod,
        shipping_method: shipping,
        notes: draft.notes || undefined,
      });
      clearCart();
      setCheckoutOk(true);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : t("cart_checkout_cta"));
    } finally {
      setCheckoutBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) {
      setCheckoutOk(true);
      return;
    }
    let draft: CheckoutDraft;
    try {
      draft = JSON.parse(raw) as CheckoutDraft;
    } catch {
      return;
    }
    void (async () => {
      setCheckoutBusy(true);
      try {
        await createCloudOrder({
          items: draft.items.map((row) => ({ product_id: row.productId, quantity: row.quantity })),
          full_name: draft.full_name,
          phone: draft.phone,
          address: draft.address,
          city: draft.city,
          postal_code: draft.postal_code,
          country: draft.country,
          company_name: draft.company_name,
          vat_number: draft.vat_number,
          payment_method: draft.payment_method,
          shipping_method: draft.shipping_method,
          notes: draft.notes || undefined,
        });
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        clearCart();
        setCheckoutOk(true);
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : t("cart_checkout_cta"));
      } finally {
        setCheckoutBusy(false);
      }
    })();
  }, [clearCart, t]);

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
            <div className="border-t border-black/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.8} />
                <p className="text-sm font-medium text-brand">
                  {shipRemain > 0
                    ? t("cart_free_ship_add", { amount: euro(shipRemain) })
                    : t("cart_free_ship_unlocked")}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8eefc]">
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${shipProgress}%` }} />
              </div>
              <p className="mt-1.5 text-right text-xs tabular-nums text-[#9aa3b2]">
                {euro(subtotal.sum)} / {euro(FREE_SHIP_THRESHOLD)}
              </p>
            </div>
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

            {!user ? (
              <div className="mt-5">
                <GuestPriceGate variant="card" />
              </div>
            ) : checkoutOk ? (
              <p className="mt-5 text-sm font-medium text-emerald-700">{t("checkout_success")}</p>
            ) : (
              <>
                {!showCheckout ? (
                  <Button
                    className="mt-5 h-12 w-full rounded-full bg-[#243f9f] text-sm font-semibold text-white hover:bg-[#1a327c]"
                    size="lg"
                    onClick={() => setShowCheckout(true)}
                  >
                    {t("cart_checkout_cta")}
                  </Button>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3">
                      <div className="space-y-1.5">
                        <Label>{t("checkout_full_name")}</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("checkout_phone")}</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("checkout_address")}</Label>
                        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>{t("checkout_city")}</Label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("checkout_postal")}</Label>
                          <Input value={postal} onChange={(e) => setPostal(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("checkout_country")}</Label>
                        <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                      </div>
                      {(user.accountType || "").toLowerCase() === "b2b" ? (
                        <>
                          <div className="space-y-1.5">
                            <Label>{t("checkout_company")}</Label>
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>{t("register_vat")}</Label>
                            <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                          </div>
                        </>
                      ) : null}
                      <div className="space-y-1.5">
                        <Label>{t("checkout_notes")}</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                      </div>
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">{t("checkout_shipping")}</legend>
                      {(
                        [
                          ["standard", t("checkout_shipping_standard")],
                          ["pickup", t("checkout_shipping_pickup")],
                          ["business", t("checkout_shipping_business")],
                        ] as const
                      ).map(([id, label]) => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="ship" checked={shipping === id} onChange={() => setShipping(id)} />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">{t("checkout_pay")}</legend>
                      {(
                        [
                          ["card", t("checkout_pay_card")],
                          ["mb_way", t("checkout_pay_mbway")],
                          ["multibanco", t("checkout_pay_multibanco")],
                          ["google_pay", t("checkout_pay_gpay")],
                          ["apple_pay", t("checkout_pay_apple")],
                          ["cash_on_delivery", t("checkout_pay_cod")],
                          ["pay_in_store", t("checkout_pay_store")],
                        ] as const
                      ).map(([id, label]) => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="pay" checked={payMethod === id} onChange={() => setPayMethod(id)} />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <p className="text-xs text-[#9aa3b2]">{t("cart_checkout_note")}</p>
                    {checkoutError ? <p className="text-sm text-red-600">{checkoutError}</p> : null}
                    <Button
                      className="h-12 w-full rounded-full bg-[#243f9f] text-sm font-semibold text-white hover:bg-[#1a327c]"
                      size="lg"
                      disabled={checkoutBusy}
                      onClick={() => void handleCheckout()}
                    >
                      {t("cart_checkout_cta")}
                    </Button>
                  </div>
                )}
              </>
            )}

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
