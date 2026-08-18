import { Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";

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
  img,
  badge,
  testPrefix = "product",
}: ProductCardProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const [loc] = useLocation();
  const wishlisted = wishHas(cartKey);
  const productHref = hrefForCartKey(cartKey);
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04]"
      data-testid={`card-${testPrefix}-${id}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishToggle(cartKey);
        }}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        data-testid={`button-wishlist-${testPrefix}-${id}`}
      >
        <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-navy"}`} />
      </button>
      <div className="px-3 pt-3">
        <div className="mb-2 min-h-[1.25rem]">
          {badge ? (
            <span className="rounded-full bg-[#D6E4FF] px-2 py-0.5 text-[10px] font-semibold text-[#2F6BFF]">
              {badge === "New" ? t("badge_new") : badge}
            </span>
          ) : null}
        </div>
        <Link href={productHref} className="block aspect-square">
          <img src={img} alt={name} className="h-full w-full object-contain" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold tabular-nums text-navy">€{price.toFixed(2).replace(".", ",")}</span>
            <ProductCartControls cartKey={cartKey} variant="icon-stepper" />
          </div>
        ) : (
          <Link
            href={loginHref}
            className="flex h-10 items-center justify-center rounded-md bg-[#2F6BFF] text-sm font-semibold text-white hover:bg-[#1f5aee]"
          >
            {t("login_for_price")}
          </Link>
        )}
        <Link href={productHref} className="mt-auto block">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-navy">{name}</h3>
        </Link>
      </div>
    </article>
  );
}
