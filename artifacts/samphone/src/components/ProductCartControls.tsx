import { Link, useLocation } from "wouter";
import { Lock, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

export default function ProductCartControls({
  cartKey,
  buttonClassName,
  size = "sm",
  variant = "default",
}: {
  cartKey: string;
  buttonClassName?: string;
  size?: Size;
  /** Compact: icon-only add button; small qty stepper (e.g. carousels) */
  variant?: "default" | "compact";
}) {
  const { user } = useAuth();
  const [loc] = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;
  const { getQty, increment, decrement } = useCart();
  const { t } = useLang();
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const atMax = qty >= maxStock;

  if (!user) {
    if (variant === "compact") {
      return (
        <Link
          href={loginHref}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border",
            "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          )}
          aria-label={t("loginToSeePrice")}
          onClick={(e) => e.stopPropagation()}
        >
          <Lock className="w-5 h-5" />
        </Link>
      );
    }
    return (
      <Button variant="outline" className={cn("w-full", size === "md" && "h-11")} asChild>
        <Link
          href={loginHref}
          className="inline-flex items-center justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Lock className="w-4 h-4 shrink-0" />
          {t("loginToSeePrice")}
        </Link>
      </Button>
    );
  }

  const iconBtn =
    variant === "compact"
      ? "h-8 w-8 shrink-0 p-0"
      : size === "sm"
        ? "h-8 w-8 shrink-0 p-0"
        : "h-10 w-10 shrink-0 p-0";
  const textSize =
    variant === "compact"
      ? "text-xs min-w-[1.5ch] text-center font-semibold tabular-nums"
      : size === "sm"
        ? "text-sm"
        : "text-base min-w-[2ch] text-center font-semibold tabular-nums";

  if (qty === 0) {
    if (variant === "compact") {
      return (
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
            buttonClassName,
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            increment(cartKey, maxStock);
          }}
          aria-label={t("addToCart")}
          data-testid={`add-cart-${cartKey}`}
        >
          <ShoppingCart className="w-5 h-5" />
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size={size === "sm" ? "sm" : "default"}
        className={cn("w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground", buttonClassName)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          increment(cartKey, maxStock);
        }}
        data-testid={`add-cart-${cartKey}`}
      >
        <ShoppingCart className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} /> {t("addToCart")}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variant === "compact" && "w-auto shrink-0 gap-0.5",
        variant !== "compact" && "w-full",
        variant !== "compact" && (size === "sm" ? "gap-1" : "gap-2"),
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={iconBtn}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          decrement(cartKey);
        }}
        aria-label="Decrease quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </Button>
      <span className={textSize}>{qty}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={iconBtn}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!atMax) increment(cartKey, maxStock);
        }}
        aria-label="Increase quantity"
        disabled={atMax}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
