import { type MouseEvent } from "react";
import { Bookmark, Heart, Package, ShoppingCart, Star } from "lucide-react";
import { Link } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { CardQtyStepper } from "@/components/ProductCartControls";
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
  const wishlisted = wishHas(cartKey);
  const productHref = hrefForCartKey(cartKey);

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishToggle(cartKey);
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
      <div className="relative aspect-square overflow-hidden bg-white">
        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand shadow-sm"
          data-testid={`button-wishlist-${testPrefix}-${id}`}
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")} strokeWidth={2.2} />
        </button>
        <Link href={productHref} className="absolute inset-0 z-10 block">
          <img
            src={img}
            alt={name}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-brand sm:text-base">{name}</h3>
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
          <span className="text-xl font-extrabold tabular-nums leading-none text-sam sm:text-[1.35rem]">
            €{price.toFixed(2).replace(".", ",")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
            <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
            {t("product_in_stock")}
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          {user ? (
            <CardQtyStepper cartKey={cartKey} />
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(productHref)}`}
              className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-sam px-3 text-sm font-bold text-white transition-colors hover:bg-brand"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{t("login_to_buy")}</span>
            </Link>
          )}
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
        </div>
      </div>
    </article>
  );
}
