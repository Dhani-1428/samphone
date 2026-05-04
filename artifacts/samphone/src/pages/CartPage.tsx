import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { Button } from "@/components/ui/button";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";

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

  const lines = useMemo(() => {
    return Object.entries(items)
      .filter(([, q]) => q > 0)
      .map(([cartKey, qty]) => buildCartLinePreview(cartKey, qty, wooById))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, wooById]);

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

  return (
    <div className="bg-muted/30 min-h-screen py-10">
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
                        <img
                          src={line.img ?? PLACEHOLDER}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 sm:hidden">
                        <p className="font-semibold text-foreground line-clamp-2">{line.name}</p>
                        {user && line.unitPrice != null && (
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
                      {user && line.unitPrice != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          €{line.unitPrice.toFixed(2)} {lang === "pt" ? "cada" : "each"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      {user ? (
                        <>
                          <ProductCartControls cartKey={line.cartKey} variant="compact" buttonClassName="rounded-xl" />
                          {line.unitPrice != null && (
                            <p className="text-sm font-semibold tabular-nums text-foreground sm:min-w-[5rem] sm:text-right">
                              €{(line.unitPrice * line.qty).toFixed(2)}
                            </p>
                          )}
                        </>
                      ) : (
                        <GuestPriceGate variant="compact" />
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
                <GuestPriceGate variant="card" />
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
                  <p className="mt-4 text-xs text-muted-foreground">{t("cart_checkout_note")}</p>
                  <Button className="mt-6 w-full sm:w-auto" size="lg" disabled>
                    {t("cart_checkout_cta")}
                  </Button>
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
