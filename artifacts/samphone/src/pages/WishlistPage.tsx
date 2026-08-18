import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { Button } from "@/components/ui/button";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import { buildCartLinePreview, buildWooProductMap } from "@/lib/cart-line-preview";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#f4f4f5" width="200" height="200"/></svg>`,
  );

export default function WishlistPage() {
  const { keys, remove } = useWishlist();
  const { t } = useLang();
  const { user } = useAuth();
  const { products } = useProductCatalog();
  const wooById = useMemo(() => buildWooProductMap(products), [products]);

  const rows = useMemo(() => {
    return keys.map((cartKey) => buildCartLinePreview(cartKey, 1, wooById));
  }, [keys, wooById]);

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToShopping")}
        </Link>

        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{t("wishlist_page_title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("wishlist_page_sub")}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden />
            <p className="mb-2 text-lg font-medium text-foreground">{t("wishlist_empty_title")}</p>
            <p className="mb-8 text-sm text-muted-foreground">{t("wishlist_empty_body")}</p>
            <Button asChild>
              <Link href="/">{t("hero_shop")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-0">
            {rows.map((row) => (
              <li
                key={row.cartKey}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <Link href={row.href} className="relative block aspect-square overflow-hidden bg-muted">
                  <img src={row.img ?? PLACEHOLDER} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      remove(row.cartKey);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/10"
                  >
                    {t("wishlist_remove")}
                  </button>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <Link href={row.href} className="font-semibold text-foreground line-clamp-2 hover:text-primary">
                    {row.name}
                  </Link>
                  {user ? (
                    row.unitPrice != null ? (
                      <p className="font-display text-lg font-bold text-foreground">€{row.unitPrice.toFixed(2)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("woo_price_na")}</p>
                    )
                  ) : (
                    <GuestPriceGate variant="compact" />
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={row.href}>{t("viewParts")}</Link>
                    </Button>
                    {user && (
                      <ProductCartControls cartKey={row.cartKey} variant="compact" />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
