import { Heart } from "lucide-react";
import { Link } from "wouter";
import { hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLang } from "@/contexts/LanguageContext";
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
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand/15 bg-white",
        "shadow-[0_6px_18px_rgba(36,63,159,0.08)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-sam/50 hover:shadow-[0_14px_28px_rgba(36,63,159,0.16)]",
        "dark:ring-white/10",
      )}
      data-testid={`card-${testPrefix}-${id}`}
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
        data-testid={`button-wishlist-${testPrefix}-${id}`}
      >
        <Heart className={cn("h-4 w-4", wishlisted ? "fill-sam text-sam" : "text-brand")} />
      </button>
      <div className="px-3 pt-3">
        <div className="mb-2 min-h-[1.25rem]">
          {badge ? (
            <span className="rounded-full bg-sam px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {badge === "New" ? t("badge_new") : badge}
            </span>
          ) : null}
        </div>
        <Link
          href={productHref}
          className="relative block overflow-hidden rounded-xl bg-[#EEF1F9] ring-1 ring-brand/10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.7),transparent_65%)]"
          />
          <span className="relative block aspect-square p-3 sm:p-3.5">
            <img
              src={img}
              alt={name}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3.5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold tabular-nums text-brand">
            €{price.toFixed(2).replace(".", ",")}
          </span>
          <ProductCartControls cartKey={cartKey} variant="icon-stepper" preview={{ name, img }} />
        </div>
        <Link href={productHref} className="mt-auto block">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#1A2744] transition-colors group-hover:text-brand dark:text-foreground">
            {name}
          </h3>
        </Link>
      </div>
    </article>
  );
}
