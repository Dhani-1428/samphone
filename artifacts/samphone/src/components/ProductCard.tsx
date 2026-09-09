import { type MouseEvent } from "react";
import { Eye, Heart, Package, Star } from "lucide-react";
import { Link } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { CardQtyStepper } from "@/components/ProductCartControls";
import ProductCardWriting from "@/components/ProductCardWriting";
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
        "product-card group relative flex h-full flex-col overflow-hidden bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,63,159,0.18)]",
      )}
      data-testid={`card-${testPrefix}-${id}`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#F7F8FA]">
        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center bg-white text-brand shadow-sm"
          data-testid={`button-wishlist-${testPrefix}-${id}`}
        >
          <Heart className={cn("h-4 w-4", wishlisted ? "fill-brand text-brand" : "")} strokeWidth={2.2} />
        </button>
        <Link href={productHref} className="absolute inset-0 z-10 block">
          <img
            src={img}
            alt={name}
            className="h-full w-full object-cover object-center"
          />
        </Link>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <ProductCardWriting href={productHref} title={name} />

        <div className="flex items-center gap-2 product-card-copy text-[12px]">
          <Star className="h-3.5 w-3.5 fill-sam text-sam" />
          <span className="font-medium uppercase text-brand">{rating.toFixed(1)}</span>
          <span className="h-3 w-px bg-brand/20" aria-hidden />
          <span className="uppercase text-muted-foreground">
            ({reviews} {t("card_reviews")})
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {user ? (
            <span className="product-card-price tabular-nums leading-none">
              €{price.toFixed(2).replace(".", ",")}
            </span>
          ) : (
            <span className="text-[12px] font-medium leading-tight text-[#5B6B86]">{t("loginForPricing")}</span>
          )}
          <span className="inline-flex items-center gap-1.5 bg-brand/10 px-2.5 py-1 text-[13px] font-semibold uppercase text-brand">
            <Package className="h-4 w-4" strokeWidth={2.2} />
            {t("product_in_stock")}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {user ? (
            <CardQtyStepper cartKey={cartKey} />
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(productHref)}`}
              className="product-card-add flex h-11 w-full items-center justify-center px-3 text-sm transition-colors hover:bg-[#1a4499]"
            >
              <span className="truncate">{t("addToCart")}</span>
            </Link>
          )}
          <Link
            href={productHref}
            className="product-card-copy flex h-11 w-full items-center justify-center gap-2 border-2 border-brand bg-white px-3 text-sm font-medium uppercase text-brand transition-colors hover:border-[#2050b3] hover:bg-[#2050b3] hover:text-white"
          >
            <Eye className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            <span className="truncate">{t("card_view_details")}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
