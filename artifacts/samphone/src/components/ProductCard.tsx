import { Star, Heart } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Lens } from "@/components/ui/lens";
import { hrefForCartKey } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

export interface ProductCardProps {
  id: number;
  cartKey: string;
  /** Used for brand filters on listing pages; not rendered on the card */
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
  brand: _brand,
  name,
  subtitle,
  price,
  oldPrice,
  rating,
  reviews,
  img,
  badge,
  buttonColor = "bg-primary hover:bg-primary/90 text-primary-foreground",
  testPrefix = "product",
}: ProductCardProps) {
  const { user } = useAuth();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const wishlisted = wishHas(cartKey);
  const [hovering, setHovering] = useState(false);
  const productHref = hrefForCartKey(cartKey);

  return (
    <div
      className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
      data-testid={`card-${testPrefix}-${id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {badge && (
          <span
            className={`absolute top-2 left-2 z-20 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badge] ?? "bg-gray-500 text-white"}`}
          >
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            wishToggle(cartKey);
          }}
          className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid={`button-wishlist-${testPrefix}-${id}`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-foreground"}`}
          />
        </button>
        <Link href={productHref} className="block relative z-10 h-full w-full">
          <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.6} lensSize={145}>
            <img
              src={img}
              alt={name}
              className={`w-full h-full object-cover transition-transform duration-300 ${hovering ? "scale-105" : "scale-100"}`}
            />
          </Lens>
        </Link>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <Link href={productHref} className="text-left hover:opacity-90 transition-opacity">
          {subtitle && <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>}
          <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{name}</h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
            />
          ))}
          <span className="text-xs text-muted-foreground">({reviews})</span>
        </div>
        {user ? (
          <>
            <div className="flex items-center gap-2 mb-3 mt-auto">
              <span className="font-display font-bold text-foreground">€{price.toFixed(2)}</span>
              {oldPrice != null && oldPrice !== undefined && (
                <span className="text-xs text-muted-foreground line-through">€{oldPrice.toFixed(2)}</span>
              )}
            </div>
            <ProductCartControls cartKey={cartKey} buttonClassName={buttonColor} size="sm" />
          </>
        ) : (
          <div className="mt-auto">
            <GuestPriceGate variant="card" />
          </div>
        )}
      </div>
    </div>
  );
}
