import { useEffect, useState, type MouseEvent } from "react";
import {
  AlertCircle,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getPrimaryImageUrl, resolveSwatchImage, wooCartKey, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { seesWholesalePrices } from "@/lib/customer-price";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import CatalogImage from "@/components/CatalogImage";
import ColorSwatches from "@/components/wc/ColorSwatches";
import ProductCardWriting from "@/components/ProductCardWriting";
import { CardQtyStepper } from "@/components/ProductCartControls";
import NotifyMeButton from "@/components/NotifyMeButton";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#F7F8FA" width="400" height="400"/><circle fill="#D1D5DB" opacity="0.55" cx="200" cy="200" r="48"/></svg>`,
  );

interface WooProductCardProps {
  product: WooProduct;
  priceUnavailableLabel: string;
  compact?: boolean;
}

export default function WooProductCard({ product, priceUnavailableLabel, compact = false }: WooProductCardProps) {
  const [imgOk, setImgOk] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const { user } = useAuth();
  const { t } = useLang();
  const [loc] = useLocation();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const { displayFormatted, hasCustomPrice, catalogCents } = useCustomerProductPrice(product);
  const showPrice = catalogCents > 0 || hasCustomPrice;
  const canBuyDealer = !product.dealerOnly || seesWholesalePrices(user);
  const swatches = product.colorSwatches ?? [];
  const hasVariants = swatches.length > 0;
  const variantImage = resolveSwatchImage(swatches, product.images, colorIdx);
  const imageUrl = variantImage || getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = wooCartKey(product.id, swatches[colorIdx]?.label);
  const wishKey = `woo:${product.id}`;
  const wishlisted = wishHas(wishKey);
  const title = product.name?.trim() || "Product";
  const inStock = product.stock_status !== "outofstock";
  const canAdd = Boolean(user && showPrice && canBuyDealer);
  const showLoginBuy = Boolean(!user && canBuyDealer);
  const priceLabel = showPrice ? displayFormatted : null;
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;

  useEffect(() => {
    setImgOk(true);
  }, [colorIdx, imageUrl]);

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishToggle(wishKey);
  };

  return (
    <article
      className={cn(
        "product-card group relative flex h-full w-full flex-col overflow-hidden bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,63,159,0.18)]",
        compact && "product-card-square text-[12px]",
      )}
    >
      <div className="product-card-media relative min-h-0 w-full flex-1 bg-white">
        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center bg-white text-brand shadow-sm"
          aria-pressed={wishlisted}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")} strokeWidth={2.2} />
        </button>

        {hasVariants ? (
          <div className="absolute left-1.5 top-2 z-20 rounded-full bg-white/85 px-1 py-1.5 shadow-sm backdrop-blur-[2px]">
            <ColorSwatches
              swatches={swatches}
              selected={colorIdx}
              onSelect={(i) => {
                setColorIdx(i);
                setImgOk(true);
              }}
              size="sm"
              direction="col"
              max={6}
            />
          </div>
        ) : null}

        <Link href={productHref} className="absolute inset-0 z-10 block overflow-hidden">
          <CatalogImage
            key={imageUrl || "placeholder"}
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={swatches[colorIdx]?.label || product.images?.[0]?.alt || product.name}
            className={cn(
              "h-full w-full object-cover object-center transition-[filter,transform,opacity] duration-200",
              !inStock && "scale-105 blur-[3px]",
            )}
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        </Link>
        {!inStock ? (
          <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center bg-black/20">
            <span className="px-2 text-center text-[12px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              {t("pdp_out_of_stock")}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "relative z-20 flex shrink-0 flex-col gap-0.5 bg-white",
          compact ? "px-1.5 pb-1.5 pt-1" : "px-2 pb-2 pt-1 sm:px-2.5 sm:pb-2",
        )}
      >
        <div className="flex h-7 shrink-0 items-center justify-between gap-1">
          {showPrice && priceLabel ? (
            <span className="product-card-price min-w-0 tabular-nums leading-none">
              {priceLabel}
            </span>
          ) : (
            <span className="inline-flex min-w-0 shrink items-center gap-1 truncate text-[13px] font-medium text-neutral-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
              <span className="truncate">{priceUnavailableLabel}</span>
            </span>
          )}
          {inStock ? (
            canAdd ? (
              <CardQtyStepper cartKey={cartKey} minQty={product.minOrderQty ?? 1} iconOnly />
            ) : showLoginBuy ? (
              <Link
                href={loginHref}
                className="product-card-add flex h-7 w-7 shrink-0 items-center justify-center transition-colors hover:bg-[#1a4499]"
                aria-label={t("addToCart")}
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={2} />
              </Link>
            ) : null
          ) : (
            <NotifyMeButton productId={String(product.cloudId || product.id)} />
          )}
        </div>

        <ProductCardWriting href={productHref} title={title} />
      </div>
    </article>
  );
}
