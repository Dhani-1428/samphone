import { Link, useLocation } from "wouter";
import { Lock, Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
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
  /**
   * - compact: icon-only add; stepper shows qty between +/- .
   * - icon-stepper: icon-only add; after add, − / qty / + — e.g. Woo cards by price.
   */
  variant?: "default" | "compact" | "icon-stepper";
}) {
  const { user } = useAuth();
  const [loc] = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;
  const { getQty, increment, decrement, openCart } = useCart();
  const { t } = useLang();
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const atMax = qty >= maxStock;
  const addToCart = () => {
    increment(cartKey, maxStock);
    if (loc !== "/cart") openCart();
  };

  if (!user) {
    if (variant === "compact" || variant === "icon-stepper") {
      return (
        <Link
          href={loginHref}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg border border-border",
            variant === "icon-stepper" ? "h-9 w-9" : "h-10 w-10",
            "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          )}
          aria-label={t("loginToSeePrice")}
          onClick={(e) => e.stopPropagation()}
        >
          <Lock className={variant === "icon-stepper" ? "w-4 h-4" : "w-5 h-5"} />
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
      : variant === "icon-stepper"
        ? "h-9 w-9 shrink-0 p-0"
        : size === "sm"
          ? "h-8 w-8 shrink-0 p-0"
          : "h-10 w-10 shrink-0 p-0";
  const textSize =
    variant === "compact"
      ? "text-xs min-w-[1.5ch] text-center font-semibold tabular-nums"
      : size === "sm"
        ? "text-sm"
        : "text-base min-w-[2ch] text-center font-semibold tabular-nums";

  if (qty > 0 && variant === "icon-stepper") {
    return (
      <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(iconBtn, buttonClassName)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            decrement(cartKey);
          }}
          aria-label="Decrease quantity"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="min-w-[2ch] px-1 text-center text-xs font-semibold tabular-nums text-foreground">
          {qty}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(iconBtn, buttonClassName)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!atMax) addToCart();
          }}
          aria-label="Increase quantity"
          disabled={atMax}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (qty === 0) {
    if (variant === "compact" || variant === "icon-stepper") {
      return (
        <Button
          type="button"
          size="icon"
          className={cn(
            variant === "icon-stepper"
              ? "h-9 w-9 shrink-0 rounded-md bg-[#2F6BFF] hover:bg-[#1f5aee] text-white shadow-none"
              : "h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
            buttonClassName,
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart();
          }}
          aria-label={t("addToCart")}
          data-testid={`add-cart-${cartKey}`}
        >
          <ShoppingBag className={variant === "icon-stepper" ? "w-[18px] h-[18px]" : "w-5 h-5"} />
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
          addToCart();
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
        (variant === "compact" || variant === "icon-stepper") && "w-auto shrink-0 gap-0.5",
        variant !== "compact" && variant !== "icon-stepper" && "w-full",
        variant !== "compact" && variant !== "icon-stepper" && (size === "sm" ? "gap-1" : "gap-2"),
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
          if (!atMax) addToCart();
        }}
        aria-label="Increase quantity"
        disabled={atMax}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
