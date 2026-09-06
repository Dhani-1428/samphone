import { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { seesWholesalePrices } from "@/lib/customer-price";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import ProductCartControls from "@/components/ProductCartControls";
import CatalogImage from "@/components/CatalogImage";
import ColorSwatches from "@/components/wc/ColorSwatches";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#E8EDF8" width="400" height="400"/><path fill="#243F9F" opacity="0.22" d="M140 160h120v80H140z"/><circle fill="#243F9F" opacity="0.22" cx="200" cy="130" r="28"/></svg>`,
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
  const { displayFormatted, hasCustomPrice, catalogCents } = useCustomerProductPrice(product);
  const showPrice = catalogCents > 0 || hasCustomPrice;
  const canBuyDealer = !product.dealerOnly || seesWholesalePrices(user);
  const swatches = product.colorSwatches ?? [];
  const variantImage = swatches[colorIdx]?.image;
  const imageUrl = variantImage || getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = `woo:${product.id}`;
  const wishlisted = wishHas(cartKey);
  const recent = isRecent(product);
  const service = isServicePack(product);

  const priceLabel = showPrice ? displayFormatted : null;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand/15 bg-white",
        "shadow-[0_6px_18px_rgba(36,63,159,0.08)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-sam/50 hover:shadow-[0_14px_28px_rgba(36,63,159,0.16)]",
        "dark:border-white/10 dark:bg-card",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishToggle(cartKey);
        }}
        className={cn(
          "absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full",
          "bg-white text-brand shadow-sm ring-1 ring-brand/10 transition-opacity",
          "opacity-0 group-hover:opacity-100 dark:bg-card dark:text-foreground",
          wishlisted && "opacity-100",
        )}
        aria-pressed={wishlisted}
        aria-label="Wishlist"
      >
        <Heart className={cn("h-4 w-4", wishlisted ? "fill-sam text-sam" : "")} />
      </button>

      {product.brand && compact ? (
        <p className="absolute left-3 top-3 z-10 max-w-[70%] truncate text-[10px] font-bold uppercase tracking-wide text-brand/70">
          {product.brand}
        </p>
      ) : null}

      <div className={cn("relative", compact ? "px-3 pt-7" : "px-3 pt-3")}>
        {!compact ? (
          <div className="mb-2 flex min-h-[1.25rem] flex-wrap gap-1">
            {recent && (
              <span className="rounded-full bg-sam px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {t("badge_new")}
              </span>
            )}
            {service && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {t("badge_service")}
              </span>
            )}
          </div>
        ) : null}

        <Link
          href={productHref}
          className="relative block overflow-hidden rounded-xl bg-[#EEF1F9] ring-1 ring-brand/10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.7),transparent_65%)]"
          />
          <span className="relative block aspect-square p-3 sm:p-3.5">
            <CatalogImage
              src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
              alt={swatches[colorIdx]?.label || product.images?.[0]?.alt || product.name}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgOk(false)}
            />
          </span>
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

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3.5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold tabular-nums leading-none text-brand">
            {showPrice && priceLabel ? priceLabel : priceUnavailableLabel}
          </span>
          {showPrice && canBuyDealer ? (
            <div onClick={(e) => e.stopPropagation()}>
              <ProductCartControls
                cartKey={cartKey}
                variant="icon-stepper"
                minQty={product.minOrderQty}
                preview={{ name: product.name, img: imageUrl }}
              />
            </div>
          ) : product.dealerOnly ? (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              {t("dealer_only")}
            </span>
          ) : null}
        </div>
        <Link href={productHref} className="mt-auto block">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-[#1A2744] transition-colors group-hover:text-brand dark:text-foreground">
            {product.name}
          </h3>
        </Link>
        {compact && product.brand ? (
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand/55">{product.brand}</p>
        ) : null}
      </div>
    </article>
  );
}
