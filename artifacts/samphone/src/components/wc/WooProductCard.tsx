import { useState, type MouseEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Eye,
  Heart,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { seesWholesalePrices } from "@/lib/customer-price";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { getStockLevel } from "@/data/inventory";
import CatalogImage from "@/components/CatalogImage";
import ColorSwatches from "@/components/wc/ColorSwatches";

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

function splitTitle(product: WooProduct): { title: string; subtitle: string } {
  const name = product.name?.trim() || "Product";
  const subtitle =
    product.partType ||
    product.brand ||
    product.categories?.[0]?.name ||
    product.subcategory ||
    "";
  if (product.modelLabel) return { title: product.modelLabel, subtitle: subtitle || name };
  const parts = name.split(/\s[-–|]\s/);
  if (parts.length > 1) return { title: parts[0], subtitle: parts.slice(1).join(" — ") || subtitle };
  return { title: name, subtitle };
}

export default function WooProductCard({ product, priceUnavailableLabel, compact = false }: WooProductCardProps) {
  const [imgOk, setImgOk] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const { user } = useAuth();
  const { t } = useLang();
  const [loc] = useLocation();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const { getQty, increment, announceAdded } = useCart();
  const { displayFormatted, hasCustomPrice, catalogCents } = useCustomerProductPrice(product);
  const showPrice = catalogCents > 0 || hasCustomPrice;
  const canBuyDealer = !product.dealerOnly || seesWholesalePrices(user);
  const swatches = product.colorSwatches ?? [];
  const variantImage = swatches[colorIdx]?.image;
  const imageUrl = variantImage || getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = `woo:${product.id}`;
  const wishlisted = wishHas(cartKey);
  const { title, subtitle } = splitTitle(product);
  const rating = product.rating && product.rating > 0 ? product.rating : 4.8;
  const reviews = product.reviewCount && product.reviewCount > 0 ? product.reviewCount : 124;
  const inStock = product.stock_status !== "outofstock";
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const canAdd = Boolean(user && showPrice && canBuyDealer);
  const showLoginBuy = Boolean(!user && showPrice && canBuyDealer);
  const priceLabel = showPrice ? displayFormatted : null;
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishToggle(cartKey);
  };

  const addToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return;
    const floor = Math.max(1, product.minOrderQty ?? 1);
    const next = qty < floor ? floor : 1;
    for (let i = 0; i < next; i += 1) increment(cartKey, maxStock);
    announceAdded({ cartKey, name: product.name, img: imageUrl });
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,63,159,0.18)]",
      )}
    >
      <div className={cn("relative overflow-hidden bg-[#F7F8FA]", compact ? "aspect-[1/0.95]" : "aspect-square")}>

        <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-sam px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t("card_original_badge")}
        </span>

        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand shadow-sm"
          aria-pressed={wishlisted}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")} strokeWidth={2.2} />
        </button>

        {product.dealerOnly ? (
          <span className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand shadow-sm">
            <Store className="h-3.5 w-3.5" strokeWidth={2.2} />
            {t("dealer_only")}
          </span>
        ) : null}

        <Link href={productHref} className="absolute inset-0 z-10 block">
          <CatalogImage
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={swatches[colorIdx]?.label || product.images?.[0]?.alt || product.name}
            className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105 sm:p-6"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        {swatches.length > 0 ? (
          <ColorSwatches
            swatches={swatches}
            selected={colorIdx}
            onSelect={(i) => {
              setColorIdx(i);
              setImgOk(true);
            }}
            size="md"
          />
        ) : null}

        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-brand sm:text-base">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-brand/55 sm:text-[13px]">
              {subtitle}
            </p>
          ) : null}
        </Link>

        <div className="flex items-center gap-2 text-[12px]">
          <Star className="h-3.5 w-3.5 fill-sam text-sam" />
          <span className="font-bold text-brand">{rating.toFixed(1)}</span>
          <span className="h-3 w-px bg-brand/20" aria-hidden />
          <span className="text-muted-foreground">
            ({reviews} {t("card_reviews")})
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {showPrice && priceLabel ? (
            <span className="text-xl font-extrabold tabular-nums leading-none text-sam sm:text-[1.35rem]">
              {priceLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sam/15 px-2.5 py-1.5 text-[11px] font-bold text-sam">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
              {priceUnavailableLabel}
            </span>
          )}
          {showPrice && inStock ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
              <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t("product_in_stock")}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          {canAdd ? (
            <>
              <button
                type="button"
                onClick={addToCart}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-sam px-3 text-sm font-bold text-white transition-colors hover:bg-brand"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="truncate">
                  {qty > 0 ? `${t("addToCart")} (${qty})` : t("addToCart")}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleWish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand/5 text-brand transition-colors hover:border-sam hover:bg-sam/10 hover:text-sam"
                aria-pressed={wishlisted}
                aria-label="Save"
              >
                <Bookmark
                  className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")}
                  strokeWidth={2.2}
                />
              </button>
            </>
          ) : showLoginBuy ? (
            <>
              <Link
                href={loginHref}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-sam px-3 text-sm font-bold text-white transition-colors hover:bg-brand"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="truncate">{t("login_to_buy")}</span>
              </Link>
              <button
                type="button"
                onClick={toggleWish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand/5 text-brand transition-colors hover:border-sam hover:bg-sam/10 hover:text-sam"
                aria-pressed={wishlisted}
                aria-label="Save"
              >
                <Bookmark
                  className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")}
                  strokeWidth={2.2}
                />
              </button>
            </>
          ) : (
            <Link
              href={productHref}
              className="flex h-11 w-full items-center gap-2 rounded-full border-2 border-brand bg-white px-3 text-sm font-bold text-brand transition-colors hover:border-sam hover:bg-sam hover:text-white"
            >
              <Eye className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-left">{t("card_view_details")}</span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
