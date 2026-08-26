import { Heart } from "lucide-react";
import { Link } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
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
  const { t } = useLang();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const wishlisted = wishHas(cartKey);
  const productHref = hrefForCartKey(cartKey);

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10"
      data-testid={`card-${testPrefix}-${id}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishToggle(cartKey);
        }}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-card dark:text-foreground"
        data-testid={`button-wishlist-${testPrefix}-${id}`}
      >
        <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-navy"}`} />
      </button>
      <div className="px-3 pt-3">
        <div className="mb-2 min-h-[1.25rem]">
          {badge ? (
            <span className="rounded-full bg-[#D6E4FA] px-2 py-0.5 text-[10px] font-semibold text-[#2B5CB8]">
              {badge === "New" ? t("badge_new") : badge}
            </span>
          ) : null}
        </div>
        <Link href={productHref} className="block aspect-square">
          <img src={img} alt={name} className="h-full w-full object-contain" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold tabular-nums text-foreground">€{price.toFixed(2).replace(".", ",")}</span>
          <ProductCartControls cartKey={cartKey} variant="icon-stepper" />
        </div>
        <Link href={productHref} className="mt-auto block">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">{name}</h3>
        </Link>
      </div>
    </article>
  );
}
