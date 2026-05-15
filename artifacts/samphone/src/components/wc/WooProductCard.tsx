import { useState } from "react";
import { Heart } from "lucide-react";
import type { WooProduct } from "@/lib/woocommerce";
import { getDisplayPrice, getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import GuestPriceGate from "@/components/GuestPriceGate";
import ProductCartControls from "@/components/ProductCartControls";
import { Link } from "wouter";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#f4f4f5" width="400" height="400"/><path fill="#d4d4d8" d="M140 160h120v80H140z"/><circle fill="#d4d4d8" cx="200" cy="130" r="28"/></svg>`,
  );

interface WooProductCardProps {
  product: WooProduct;
  priceUnavailableLabel: string;
}

export default function WooProductCard({ product, priceUnavailableLabel }: WooProductCardProps) {
  const [imgOk, setImgOk] = useState(true);
  const { user } = useAuth();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const currencySymbol = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";
  const displayPrice = getDisplayPrice(product);
  const showPrice = user != null && displayPrice != null;
  const imageUrl = getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = `woo:${product.id}`;
  const wishlisted = wishHas(cartKey);
  const showCartByPrice = showPrice || user == null;

  const imageBlock = (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishToggle(cartKey);
        }}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur transition-opacity hover:bg-background"
        aria-pressed={wishlisted}
        aria-label="Wishlist"
      >
        <Heart className={cn("h-4 w-4", wishlisted ? "fill-red-500 text-red-500" : "text-foreground")} />
      </button>
      <Link href={productHref} className="relative z-10 block h-full w-full">
        <img
          src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
          alt={product.images?.[0]?.alt || product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={() => setImgOk(false)}
        />
      </Link>
    </>
  );

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card",
        "shadow-sm transition-[box-shadow,transform] duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">{imageBlock}</div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <div className="min-w-0 flex-1 text-sm tabular-nums text-foreground/90">
            {showPrice ? (
              <span className="font-medium">
                {currencySymbol}
                {displayPrice}
              </span>
            ) : user == null ? (
              <GuestPriceGate variant="compact" />
            ) : (
              <span className="text-muted-foreground">{priceUnavailableLabel}</span>
            )}
          </div>
          {showCartByPrice && (
            <div className="shrink-0 self-end" onClick={(e) => e.stopPropagation()}>
              <ProductCartControls cartKey={cartKey} variant="icon-stepper" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
