import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { FaCcMastercard, FaCcPaypal, FaCcVisa } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CatalogImage from "@/components/CatalogImage";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import {
  CHECKOUT_DRAFT_KEY,
  createCloudOrder,
  startStripeCheckout,
  type CheckoutDraft,
} from "@/lib/samphone-cloud";
import { clearTradeInVoucher, loadTradeInVoucher } from "@/lib/trade-in";

function euro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

const FREE_SHIP_THRESHOLD = 150;
const STANDARD_SHIPPING = 9.9;
const VAT_RATE = 0.23;

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#f4f4f5" width="80" height="80"/></svg>`,
  );

export default function CheckoutPage() {
  const { items, clearCart, totalItems } = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { products: wooProducts } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(wooProducts), [wooProducts]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutOk, setCheckoutOk] = useState(false);
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

  useEffect(() => {
    if (!user) {
      setLocation(`/login?next=${encodeURIComponent("/checkout")}`);
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (user && lines.length === 0 && !checkoutOk) {
      setLocation("/cart");
    }
  }, [user, lines.length, checkoutOk, setLocation]);

  const handleCheckout = async () => {
    const payload = lines
      .filter((line) => line.productId && line.qty > 0)
      .map((line) => ({ productId: line.productId as string, quantity: line.qty }));
    if (payload.length === 0) {
      setCheckoutError(t("cart_checkout_note"));
      return;
    }
    if (!user) {
      setLocation(`/login?next=${encodeURIComponent("/checkout")}`);
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
        const url = await startStripeCheckout(payload, { successPath: "/checkout?checkout=success" });
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
      setCheckoutError(e instanceof Error ? e.message : t("checkout_place_order"));
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
        setCheckoutError(e instanceof Error ? e.message : t("checkout_place_order"));
      } finally {
        setCheckoutBusy(false);
      }
    })();
  }, [clearCart, t]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 md:px-8">
        <nav className="mb-5 flex items-center gap-2 text-sm text-[#6b7280]">
          <Link href="/" className="hover:text-brand">
            {t("breadcrumb_home")}
          </Link>
          <span className="text-[#c4c9d4]">›</span>
          <Link href="/cart" className="hover:text-brand">
            {t("nav_cart")}
          </Link>
          <span className="text-[#c4c9d4]">›</span>
          <span className="font-medium text-[#111111]">{t("checkout_page_title")}</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111] md:text-[2rem]">{t("checkout_page_title")}</h1>
            <p className="mt-1 text-[15px] text-[#6b7280]">{t("checkout_page_sub")}</p>
          </div>
          <Link
            href="/cart"
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-black/[0.12] bg-white px-4 text-sm font-medium text-[#111111] shadow-sm hover:border-brand hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("checkout_back_cart")}
          </Link>
        </div>

        {checkoutOk ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
            <p className="text-lg font-semibold text-emerald-700">{t("checkout_success")}</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
              {t("cart_sider_continue")}
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("checkout_full_name")}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("checkout_phone")}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("checkout_address")}</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("checkout_city")}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("checkout_postal")}</Label>
                  <Input value={postal} onChange={(e) => setPostal(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("checkout_notes")}</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <fieldset className="mt-6 space-y-2">
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
              <fieldset className="mt-5 space-y-2">
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
              <p className="mt-4 text-xs text-[#9aa3b2]">{t("cart_checkout_note")}</p>
              {checkoutError ? <p className="mt-2 text-sm text-red-600">{checkoutError}</p> : null}
            </div>

            <aside className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-[#111111]">{t("cart_order_summary")}</h2>
              <ul className="mt-4 space-y-3">
                {lines.map((line) => (
                  <li key={line.cartKey} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-black/[0.06] bg-[#F7F8FA]">
                      <CatalogImage src={line.img ?? PLACEHOLDER} alt="" className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-[#111111]">{line.name}</p>
                      <p className="text-xs text-[#9aa3b2]">× {line.qty}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {line.unitPrice != null ? euro(line.unitPrice * line.qty) : "—"}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-3 border-t border-black/[0.08] pt-4 text-sm">
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
              {tradeIn ? (
                <p className="mt-3 text-sm">
                  {t("trade_code_label")}: <span className="font-mono font-semibold">{tradeIn.code}</span>
                  <button
                    type="button"
                    className="ml-2 text-xs text-[#9aa3b2] hover:text-red-600"
                    onClick={() => {
                      clearTradeInVoucher();
                      setTradeIn(null);
                    }}
                  >
                    {t("cart_remove_line")}
                  </button>
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between border-t border-black/[0.08] pt-4">
                <span className="text-base font-bold text-[#111111]">{t("cart_total")}</span>
                <span className="text-xl font-bold tabular-nums text-[#111111]">{subtotal.missing ? "—" : euro(grandTotal)}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#9aa3b2]">{t("cart_vat_note")}</p>
              <Button
                className="mt-5 h-12 w-full rounded-full bg-[#243f9f] text-sm font-semibold text-white hover:bg-[#1a327c]"
                size="lg"
                disabled={checkoutBusy || lines.length === 0}
                onClick={() => void handleCheckout()}
              >
                {t("checkout_place_order")}
              </Button>
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
        )}
      </div>
    </div>
  );
}
