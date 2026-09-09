import { type MouseEvent } from "react";
import { Link, useLocation } from "wouter";
import { Lock, Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

/** Add to cart first; after a click, orange − qty + . Does not open the side cart. */
export function CardQtyStepper({
  cartKey,
  minQty = 1,
  iconOnly = false,
}: {
  cartKey: string;
  minQty?: number;
  iconOnly?: boolean;
}) {
  const { t } = useLang();
  const { getQty, increment, decrement } = useCart();
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const floor = Math.max(1, minQty);
  const atMax = qty >= maxStock;

  const addToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (atMax) return;
    const next = qty < floor ? floor : 1;
    for (let i = 0; i < next; i += 1) increment(cartKey, maxStock);
  };

  const onMinus = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    decrement(cartKey);
  };

  if (qty <= 0) {
    return (
      <button
        type="button"
        className={cn(
          "product-card-add flex items-center justify-center transition-colors hover:bg-[#1a4499]",
          iconOnly ? "h-9 w-9 shrink-0" : "h-9 min-w-0 flex-1 px-3 text-xs",
        )}
        onClick={addToCart}
        data-testid={`add-cart-${cartKey}`}
        aria-label={t("addToCart")}
      >
        {iconOnly ? (
          <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
        ) : (
          <span className="truncate">{t("addToCart")}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "product-card-add flex h-9 items-center",
        iconOnly ? "w-auto shrink-0" : "min-w-0 flex-1",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-40"
        onClick={onMinus}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <span className="min-w-0 flex-1 text-center text-sm font-bold tabular-nums">{qty}</span>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-40"
        onClick={addToCart}
        disabled={atMax}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default function ProductCartControls({
  cartKey,
  buttonClassName,
  size = "sm",
  variant = "default",
  minQty = 1,
  preview,
}: {
  cartKey: string;
  buttonClassName?: string;
  size?: Size;
  /**
   * - compact: icon-only add; stepper shows qty between +/- .
   * - icon-stepper: icon-only add; after add, − / qty / + — e.g. Woo cards by price.
   */
  variant?: "default" | "compact" | "icon-stepper";
  minQty?: number;
  preview?: { name?: string; img?: string | null };
}) {
  const { user } = useAuth();
  const [loc] = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;
  const { getQty, increment, decrement } = useCart();
  const { t } = useLang();
  const qty = getQty(cartKey);
  const maxStock = getStockLevel(cartKey).count;
  const floor = Math.max(1, minQty ?? 1);
  const atMax = qty >= maxStock;
  const addToCart = () => {
    const next = qty < floor ? floor : 1;
    for (let i = 0; i < next; i += 1) increment(cartKey, maxStock);
  };

  if (!user) {
    if (variant === "compact" || variant === "icon-stepper") {
      return (
        <Link
          href={loginHref}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg border-0 text-white transition-colors",
            variant === "icon-stepper" ? "h-9 w-9" : "h-10 w-10",
            "bg-brand shadow-sm hover:bg-brand-dark",
          )}
          aria-label={t("login_to_buy")}
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
          {t("login_to_buy")}
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
              ? "h-9 w-9 shrink-0 rounded-lg bg-brand text-white shadow-sm hover:bg-brand-dark"
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
      <span className={cn(textSize, variant !== "compact" && variant !== "icon-stepper" && "min-w-0 flex-1")}>{qty}</span>
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
