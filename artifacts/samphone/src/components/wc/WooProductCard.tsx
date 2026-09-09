import { useState, type MouseEvent } from "react";
import {
  AlertCircle,
  Eye,
  Heart,
  Package,
  Store,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { canSeePrices, seesWholesalePrices } from "@/lib/customer-price";
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
  const loggedIn = canSeePrices(user);
  const showPrice = loggedIn && (catalogCents > 0 || hasCustomPrice);
  const canBuyDealer = !product.dealerOnly || seesWholesalePrices(user);
  const swatches = product.colorSwatches ?? [];
  const variantImage = swatches[colorIdx]?.image;
  const imageUrl = variantImage || getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = `woo:${product.id}`;
  const wishlisted = wishHas(cartKey);
  const title = product.name?.trim() || "Product";
  const inStock = product.stock_status !== "outofstock";
  const canAdd = Boolean(user && showPrice && canBuyDealer);
  const showLoginBuy = Boolean(!user && canBuyDealer);
  const priceLabel = showPrice ? displayFormatted : null;
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishToggle(cartKey);
  };

  return (
    <article
      className={cn(
        "product-card group relative flex w-full flex-col overflow-hidden bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,63,159,0.18)]",
        compact && "text-[12px]",
      )}
    >
      <div className="relative min-h-0 flex-1 bg-[#F7F8FA]">
        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center bg-white text-brand shadow-sm"
          aria-pressed={wishlisted}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")} strokeWidth={2.2} />
        </button>

        {product.dealerOnly ? (
          <span className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 bg-white/95 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-normal text-brand shadow-sm">
            <Store className="h-3 w-3" strokeWidth={2.2} />
            {t("dealer_only")}
          </span>
        ) : null}

        <Link href={productHref} className="absolute inset-0 z-10 block">
          <CatalogImage
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={swatches[colorIdx]?.label || product.images?.[0]?.alt || product.name}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        </Link>
      </div>

      <div className="relative z-20 flex shrink-0 flex-col gap-1 bg-white px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5">
        {swatches.length > 0 ? (
          <ColorSwatches
            swatches={swatches}
            selected={colorIdx}
            onSelect={(i) => {
              setColorIdx(i);
              setImgOk(true);
            }}
            size="sm"
          />
        ) : null}

        <ProductCardWriting href={productHref} title={title} />

        <div className="flex items-center justify-between gap-1">
          {!loggedIn ? (
            <span className="text-[12px] font-medium leading-tight text-[#5B6B86]">{t("loginForPricing")}</span>
          ) : showPrice && priceLabel ? (
            <span className="product-card-price tabular-nums leading-none">
              {priceLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-sam">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
              {priceUnavailableLabel}
            </span>
          )}
          {inStock ? (
            showPrice ? (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase text-brand">
              <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t("product_in_stock")}
            </span>
            ) : null
          ) : (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase text-sam">
              {t("pdp_out_of_stock")}
            </span>
          )}
        </div>

        <div className="flex gap-1">
          {inStock ? (
            canAdd ? (
              <CardQtyStepper cartKey={cartKey} minQty={product.minOrderQty ?? 1} />
            ) : showLoginBuy ? (
              <Link
                href={loginHref}
                className="product-card-add flex h-9 min-w-0 flex-1 items-center justify-center px-2 text-xs transition-colors hover:bg-[#1a4499]"
              >
                <span className="truncate">{t("addToCart")}</span>
              </Link>
            ) : null
          ) : (
            <NotifyMeButton productId={String(product.cloudId || product.id)} />
          )}
          <Link
            href={productHref}
            className="product-card-copy flex h-9 min-w-0 flex-1 items-center justify-center gap-1 border-2 border-brand bg-white px-2 text-xs font-medium uppercase text-brand transition-colors hover:border-[#2050b3] hover:bg-[#2050b3] hover:text-white"
          >
            <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
            <span className="truncate">{t("card_view_details")}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
