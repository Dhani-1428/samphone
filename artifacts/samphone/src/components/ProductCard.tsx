import { type MouseEvent } from "react";
import { ArrowRight, Heart, ShieldCheck, ShoppingCart, Star } from "lucide-react";
import { Link } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  id: number;
  cartKey: string;
  brand?: string;
  name: string;
  subtitle?: string;
  price: number;
  oldPrice?: number | null;
  rating: number;
  reviews: number;
  img: string;
  badge?: string | null;
  buttonColor?: string;
  testPrefix?: string;
}

function MediaBackdrop() {
  return (
    <>
      <span className="absolute inset-0 bg-brand" aria-hidden />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 top-4 h-24 w-24 rotate-12 rounded-3xl bg-sam/35"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-8 top-10 h-10 w-16 -rotate-6 rounded-full bg-sam/50"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-brand-dark"
        style={{ clipPath: "ellipse(85% 100% at 50% 100%)" }}
      />
    </>
  );
}

export default function ProductCard({
  id,
  cartKey,
  name,
  subtitle,
  price,
  rating,
  reviews,
  img,
  testPrefix = "product",
}: ProductCardProps) {
  const { t } = useLang();
  const { user } = useAuth();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const { getQty, increment, announceAdded } = useCart();
  const wishlisted = wishHas(cartKey);
  const productHref = hrefForCartKey(cartKey);
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;

  const addToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    increment(cartKey, maxStock);
    announceAdded({ cartKey, name, img });
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,63,159,0.18)]",
      )}
      data-testid={`card-${testPrefix}-${id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <MediaBackdrop />
        <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-sam px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t("card_original_badge")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            wishToggle(cartKey);
          }}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-sam bg-white text-sam shadow-sm"
          data-testid={`button-wishlist-${testPrefix}-${id}`}
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-sam text-sam" : "")} strokeWidth={2.2} />
        </button>
        <Link href={productHref} className="absolute inset-0 z-10 block">
          <img
            src={img}
            alt={name}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 sm:p-5"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-brand sm:text-base">{name}</h3>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold text-brand/65 sm:text-[13px]">
              {subtitle}
            </p>
          ) : null}
        </Link>

        <div className="flex items-center gap-1.5 text-[12px]">
          <Star className="h-3.5 w-3.5 fill-sam text-sam" />
          <span className="font-bold text-brand">{rating.toFixed(1)}</span>
          <span className="text-muted-foreground">
            ({reviews} {t("card_reviews")})
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xl font-extrabold tabular-nums leading-none text-sam sm:text-[1.35rem]">
            €{price.toFixed(2).replace(".", ",")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sam/15 px-2.5 py-1 text-[11px] font-bold text-sam">
            <span className="h-1.5 w-1.5 rounded-full bg-sam" />
            {t("product_in_stock")}
          </span>
        </div>

        <div className="mt-auto pt-1">
          {user ? (
            <button
              type="button"
              onClick={addToCart}
              className="flex h-11 w-full items-center gap-2 rounded-full bg-brand px-3 text-sm font-bold text-white transition-colors hover:bg-sam"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-left">
                {qty > 0 ? `${t("addToCart")} (${qty})` : t("addToCart")}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sam text-white">
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </span>
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(productHref)}`}
              className="flex h-11 w-full items-center gap-2 rounded-full bg-brand px-3 text-sm font-bold text-white transition-colors hover:bg-sam"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-left">{t("login_to_buy")}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sam text-white">
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
