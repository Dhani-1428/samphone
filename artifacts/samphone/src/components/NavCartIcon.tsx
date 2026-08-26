import { LottieSvg } from "lottie-react";
import shoppingCart from "@/assets/lottie/shopping-cart.json";
import { cn } from "@/lib/utils";

export default function NavCartIcon({ className }: { className?: string }) {
  return (
    <LottieSvg
      src={shoppingCart}
      autoplay
      loop
      aria-hidden
      className={cn("h-8 w-8", className)}
    />
  );
}
