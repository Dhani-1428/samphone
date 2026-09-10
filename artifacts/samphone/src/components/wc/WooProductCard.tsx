import { useEffect, useState, type MouseEvent } from "react";
import {
  AlertCircle,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WooProduct } from "@/lib/woocommerce";
import { getPrimaryImageUrl, wooCartKey, wooProductHref } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";
import { classifyCatalogProduct } from "@/lib/catalog-taxonomy";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { seesWholesalePrices } from "@/lib/customer-price";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import CatalogImage from "@/components/CatalogImage";
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

const coverScaleCache = new Map<string, number>();
const COVER_FALLBACK_SCALE = 1.72;

function isLightPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return true;
  return r > 238 && g > 238 && b > 238;
}

function subjectBox(img: HTMLImageElement): { w: number; h: number } | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (nw < 8 || nh < 8) return null;
  const max = 140;
  const s = Math.min(1, max / Math.max(nw, nh));
  const cw = Math.max(1, Math.round(nw * s));
  const ch = Math.max(1, Math.round(nh * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    let minX = cw;
    let minY = ch;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < ch; y += 1) {
      for (let x = 0; x < cw; x += 1) {
        const i = (y * cw + x) * 4;
        if (isLightPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX) return null;
    const inv = 1 / s;
    return { w: (maxX - minX + 1) * inv, h: (maxY - minY + 1) * inv };
  } catch {
    return null;
  }
}

function scaleFromBox(img: HTMLImageElement, box: HTMLElement, sub: { w: number; h: number }): number {
  const bw = box.clientWidth;
  const bh = box.clientHeight;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (bw < 8 || bh < 8 || nw < 8 || nh < 8 || sub.w < 8 || sub.h < 8) return COVER_FALLBACK_SCALE;
  const area = (sub.w * sub.h) / (nw * nh);
  if (area < 0.06) return COVER_FALLBACK_SCALE;
  if (area > 0.88) return 1.08;
  const fitted = Math.min(bw / nw, bh / nh);
  const dw = sub.w * fitted;
  const dh = sub.h * fitted;
  if (dw < 1 || dh < 1) return COVER_FALLBACK_SCALE;
  return Math.min(Math.max((Math.min(bw / dw, bh / dh) * 0.9), 1.05), 2.05);
}

function loadImageForMeasure(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.referrerPolicy = "no-referrer";
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

async function coverPhotoScale(displayed: HTMLImageElement, src: string): Promise<number> {
  const cached = coverScaleCache.get(src);
  if (cached) return cached;
  const box = displayed.parentElement;
  let scale = COVER_FALLBACK_SCALE;
  const fromDisplayed = subjectBox(displayed);
  if (box && fromDisplayed) {
    scale = scaleFromBox(displayed, box, fromDisplayed);
  } else {
    const independent = await loadImageForMeasure(src);
    const sub = independent ? subjectBox(independent) : null;
    if (box && independent && sub) {
      scale = scaleFromBox(displayed, box, sub);
    }
  }
  coverScaleCache.set(src, scale);
  return scale;
}

export default function WooProductCard({ product, priceUnavailableLabel, compact = false }: WooProductCardProps) {
  const [imgOk, setImgOk] = useState(true);
  const [coverScale, setCoverScale] = useState(1);
  const { user } = useAuth();
  const { t } = useLang();
  const [loc] = useLocation();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const { displayFormatted, hasCustomPrice, catalogCents } = useCustomerProductPrice(product);
  const showPrice = catalogCents > 0 || hasCustomPrice;
  const canBuyDealer = !product.dealerOnly || seesWholesalePrices(user);
  const coverSub = classifyCatalogProduct(product).subcategory;
  const isCover = coverSub === "back-cover" || coverSub === "case";
  const imageUrl = getPrimaryImageUrl(product);
  const productHref = wooProductHref(product.id);
  const cartKey = wooCartKey(product.id);
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
    setCoverScale(isCover ? (imageUrl ? coverScaleCache.get(imageUrl) || COVER_FALLBACK_SCALE : 1) : 1);
  }, [imageUrl, isCover]);

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishToggle(wishKey);
  };

  return (
    <article
      className={cn(
        "product-card group relative flex h-auto w-full flex-col bg-white",
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

        <Link
          href={productHref}
          className={cn(
            "absolute inset-0 z-10 block overflow-hidden bg-white",
            isCover ? "px-1.5 pb-1.5 pt-2" : "p-2",
          )}
        >
          <CatalogImage
            key={imageUrl || "placeholder"}
            src={imgOk && imageUrl ? imageUrl : PLACEHOLDER}
            alt={product.images?.[0]?.alt || product.name}
            className={cn(
              "h-full w-full origin-center object-contain object-center transition-[filter,transform,opacity] duration-200",
              !inStock && "blur-[3px]",
            )}
            style={isCover ? { transform: `scale(${coverScale})` } : undefined}
            loading="eager"
            decoding="async"
            onLoad={(e) => {
              if (!isCover || !imageUrl) return;
              const el = e.currentTarget;
              void coverPhotoScale(el, imageUrl).then(setCoverScale).catch(() => setCoverScale(COVER_FALLBACK_SCALE));
            }}
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
          "relative z-20 flex shrink-0 flex-col gap-1 bg-white",
          compact ? "px-1.5 pb-1.5 pt-1" : "px-2 pb-1.5 pt-1 sm:px-2.5",
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
