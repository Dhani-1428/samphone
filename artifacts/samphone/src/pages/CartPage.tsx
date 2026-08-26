import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ProductCartControls from "@/components/ProductCartControls";
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

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="#f4f4f5" width="120" height="120"/><path fill="#d4d4d8" d="M40 48h40v24H40z"/></svg>`,
  );

export default function CartPage() {
  const { items, removeLine, clearCart, totalItems } = useCart();
  const { t, lang } = useLang();
  const { user } = useAuth();
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

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToShopping")}
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{t("cart_page_title")}</h1>
              <p className="mt-1 text-muted-foreground">{t("cart_page_sub")}</p>
            </div>
          </div>
          {lines.length > 0 && (
            <Button variant="outline" size="sm" className="shrink-0 gap-2 self-start sm:self-auto" onClick={() => clearCart()}>
              <Trash2 className="h-4 w-4" />
              {t("cart_clear")}
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden />
            <p className="mb-2 text-lg font-medium text-foreground">{t("cart_empty_title")}</p>
            <p className="mb-8 text-sm text-muted-foreground">{t("cart_empty_body")}</p>
            <Button asChild>
              <Link href="/store">{t("nav_woo_store")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {lines.map((line) => {
                const maxStock = getStockLevel(line.cartKey).count;
                return (
                  <li key={line.cartKey} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                    <Link href={line.href} className="flex shrink-0 gap-4 sm:items-center">
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted sm:h-24 sm:w-24">
                        <CatalogImage
                          src={line.img ?? PLACEHOLDER}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 sm:hidden">
                        <p className="font-semibold text-foreground line-clamp-2">{line.name}</p>
                        {line.unitPrice != null && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            €{line.unitPrice.toFixed(2)} {lang === "pt" ? "cada" : "each"}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1 max-sm:hidden">
                      <Link href={line.href} className="font-semibold text-foreground hover:text-primary line-clamp-2">
                        {line.name}
                      </Link>
                      {line.unitPrice != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          €{line.unitPrice.toFixed(2)} {lang === "pt" ? "cada" : "each"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <ProductCartControls
                        cartKey={line.cartKey}
                        variant="compact"
                        buttonClassName="rounded-xl"
                        minQty={line.minOrderQty}
                      />
                      {line.unitPrice != null && (
                        <p className="text-sm font-semibold tabular-nums text-foreground sm:min-w-[5rem] sm:text-right">
                          €{(line.unitPrice * line.qty).toFixed(2)}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.cartKey)}
                      >
                        {t("cart_remove_line")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm",
                !user && "opacity-90",
              )}
            >
              {!user ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                    <span className="text-muted-foreground">{t("cart_subtotal")}</span>
                    <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                      {subtotal.missing ? "—" : `€${subtotal.sum.toFixed(2)}`}
                    </span>
                  </div>
                  <GuestPriceGate variant="card" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                    <span className="text-muted-foreground">{t("cart_subtotal")}</span>
                    <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                      {subtotal?.missing ? "—" : `€${(subtotal?.sum ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  {subtotal?.missing && (
                    <p className="mt-3 text-xs text-muted-foreground">{t("cart_subtotal_partial")}</p>
                  )}
                  {tradeIn && (
                    <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                      <p>
                        {t("trade_code_label")}: <span className="font-mono font-semibold">{tradeIn.code}</span>
                        <span className="ml-2 text-muted-foreground">€{tradeIn.value}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{t("trade_apply")}</span>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearTradeInVoucher();
                          setTradeIn(null);
                        }}
                      >
                        {t("cart_remove_line")}
                      </Button>
                    </div>
                  )}
                  {checkoutOk ? (
                    <p className="mt-4 text-sm font-medium text-emerald-700">{t("checkout_success")}</p>
                  ) : (
                    <div className="mt-6 space-y-4">
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
                        <div className="space-y-1.5 sm:col-span-2">
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
                      <p className="text-xs text-muted-foreground">{t("cart_checkout_note")}</p>
                      {checkoutError ? <p className="text-sm text-red-600">{checkoutError}</p> : null}
                      <Button
                        className="w-full sm:w-auto"
                        size="lg"
                        disabled={checkoutBusy || !user}
                        onClick={() => void handleCheckout()}
                      >
                        {t("cart_checkout_cta")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t("cart_items_count", { count: totalItems })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
