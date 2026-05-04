import { useState } from "react";
import type { WooProduct } from "@/lib/woocommerce";
import { getDisplayPrice, getPrimaryImageUrl } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import GuestPriceGate from "@/components/GuestPriceGate";
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
  const currencySymbol = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";
  const displayPrice = getDisplayPrice(product);
  const showPrice = user != null && displayPrice != null;
  const imageUrl = getPrimaryImageUrl(product);
  const productHref = `/product/woo/${product.id}`;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card",
        "shadow-sm transition-[box-shadow,transform] duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <Link href={productHref} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <img
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={product.images?.[0]?.alt || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto pt-1 text-sm tabular-nums text-foreground/90">
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
      </div>
    </article>
  );
}
