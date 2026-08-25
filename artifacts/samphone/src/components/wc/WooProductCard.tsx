import { useState } from "react";
import { Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getDisplayPrice, getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import ProductCartControls from "@/components/ProductCartControls";
import CatalogImage from "@/components/CatalogImage";
import ColorSwatches from "@/components/wc/ColorSwatches";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#f4f4f5" width="400" height="400"/><path fill="#d4d4d8" d="M140 160h120v80H140z"/><circle fill="#d4d4d8" cx="200" cy="130" r="28"/></svg>`,
  );

interface WooProductCardProps {
  product: WooProduct;
  priceUnavailableLabel: string;
  /** Tighter catalog tile used on accessory group pages. */
  compact?: boolean;
}

function isRecent(product: WooProduct) {
  if (!product.date_created) return false;
  const created = new Date(product.date_created).getTime();
  return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60 * 24 * 45;
}

function isServicePack(product: WooProduct) {
  return /\b(battery|screen|lcd|oled|digitizer|flex|housing|camera|speaker|charging)\b/i.test(product.name);
}

export default function WooProductCard({ product, priceUnavailableLabel, compact = false }: WooProductCardProps) {
  const [imgOk, setImgOk] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const { user } = useAuth();
  const { t } = useLang();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const [loc] = useLocation();
  const currencySymbol = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";
  const catalogPrice = getDisplayPrice(product);
  const { displayFormatted, hasCustomPrice } = useCustomerProductPrice(product);
  const showPrice = user != null && (catalogPrice != null || hasCustomPrice);
  const swatches = product.colorSwatches ?? [];
  const variantImage = swatches[colorIdx]?.image;
  const imageUrl = variantImage || getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = `woo:${product.id}`;
  const wishlisted = wishHas(cartKey);
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;
  const recent = isRecent(product);
  const service = isServicePack(product);

  const priceLabel = hasCustomPrice
    ? displayFormatted
    : catalogPrice != null
      ? `${Number(catalogPrice).toFixed(2).replace(".", ",")}${currencySymbol}`
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-card">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishToggle(cartKey);
        }}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-card dark:text-foreground"
        aria-pressed={wishlisted}
        aria-label="Wishlist"
      >
        <Heart className={cn("h-4 w-4", wishlisted ? "fill-red-500 text-red-500" : "")} />
      </button>

      {product.brand && compact ? (
        <p className="absolute right-3 top-3 z-10 max-w-[70%] truncate text-[10px] font-bold uppercase tracking-wide text-foreground/70">
          {product.brand}
        </p>
      ) : null}

      <div className={cn("relative", compact ? "px-4 pt-8" : "px-3 pt-3")}>
        {!compact ? (
          <div className="mb-2 flex min-h-[1.25rem] flex-wrap gap-1">
            {recent && (
              <span className="rounded-full bg-[#D6E4FF] px-2 py-0.5 text-[10px] font-semibold text-[#5A73A8]">
                {t("badge_new")}
              </span>
            )}
            {service && (
              <span className="rounded-full bg-[#D6E4FF] px-2 py-0.5 text-[10px] font-semibold text-[#5A73A8]">
                {t("badge_service")}
              </span>
            )}
          </div>
        ) : null}
        <Link href={productHref} className="block aspect-square bg-white">
          <CatalogImage
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={swatches[colorIdx]?.label || product.images?.[0]?.alt || product.name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        </Link>
        {swatches.length > 0 ? (
          <div className="mt-2">
            <ColorSwatches
              swatches={swatches}
              selected={colorIdx}
              onSelect={(i) => {
                setColorIdx(i);
                setImgOk(true);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold tabular-nums leading-none text-foreground">
              {showPrice && priceLabel ? priceLabel : priceUnavailableLabel}
            </span>
            {showPrice && (
              <div onClick={(e) => e.stopPropagation()}>
                <ProductCartControls cartKey={cartKey} variant="icon-stepper" />
              </div>
            )}
          </div>
        ) : (
          <Link
            href={loginHref}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5A73A8] px-3 text-center text-sm font-semibold leading-tight text-white hover:bg-[#4A6494]"
          >
            {t("login_for_price")}
          </Link>
        )}
        <Link href={productHref} className="mt-auto block">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-foreground">{product.name}</h3>
        </Link>
        {compact && product.brand ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        ) : null}
      </div>
    </article>
  );
}
