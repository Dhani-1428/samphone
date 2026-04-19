import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { useState } from "react";

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

export interface ProductCardProps {
  id: number;
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
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <div
      className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
      data-testid={`card-${testPrefix}-${id}`}
    >
      {/* Direction-aware image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {badge && (
          <span
            className={`absolute top-2 left-2 z-20 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badge] ?? "bg-gray-500 text-white"}`}
          >
            {badge}
          </span>
        )}
        <button
          onClick={() => setWishlisted((v) => !v)}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid={`button-wishlist-${testPrefix}-${id}`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-foreground"}`}
          />
        </button>
        <DirectionAwareHover
          imageUrl={img}
          className="w-full h-full"
          imageClassName="w-full h-full object-cover"
        >
          <p className="font-bold text-sm leading-snug drop-shadow-sm line-clamp-2">{name}</p>
          <p className="text-white/80 text-xs mt-0.5">€{price.toFixed(2)}</p>
        </DirectionAwareHover>
      </div>

      {/* Card info */}
      <div className="p-3 flex flex-col flex-1">
        {subtitle && <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>}
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{name}</h3>
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
            />
          ))}
          <span className="text-xs text-muted-foreground">({reviews})</span>
        </div>
        <div className="flex items-center gap-2 mb-3 mt-auto">
          <span className="font-display font-bold text-foreground">€{price.toFixed(2)}</span>
          {oldPrice && (
            <span className="text-xs text-muted-foreground line-through">€{oldPrice.toFixed(2)}</span>
          )}
        </div>
        <Button
          size="sm"
          className={`w-full gap-1.5 text-xs ${buttonColor}`}
          data-testid={`button-cart-${testPrefix}-${id}`}
        >
          <ShoppingCart className="w-3 h-3" /> Add to Cart
        </Button>
      </div>
    </div>
  );
}
