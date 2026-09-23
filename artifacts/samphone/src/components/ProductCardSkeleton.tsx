import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProductCardSkeleton({ compact = true }: { compact?: boolean }) {
  return (
    <article
      className={cn(
        "product-card flex h-auto w-full flex-col bg-white",
        "shadow-[0_10px_28px_rgba(36,63,159,0.12)]",
        compact && "product-card-square",
      )}
      aria-hidden
    >
      <div className="product-card-media relative w-full bg-[#F7F8FA]">
        <Skeleton className="absolute inset-0 rounded-none bg-neutral-200/80" />
      </div>
      <div className={cn("flex shrink-0 flex-col gap-2 bg-white", compact ? "px-1.5 pb-2 pt-1.5" : "px-2.5 pb-2.5 pt-2")}>
        <Skeleton className="h-5 w-16 rounded-sm bg-neutral-200" />
        <Skeleton className="h-3.5 w-[92%] rounded-sm bg-neutral-200" />
        <Skeleton className="h-3.5 w-[70%] rounded-sm bg-neutral-200" />
        <Skeleton className="mt-1 h-8 w-full rounded-sm bg-neutral-200" />
      </div>
    </article>
  );
}

/** Enough cards to fill a homepage rail row (2 / 3 / 4 / 6 across). */
export function ProductRailSkeletons({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={`product-skel-${i}`} />
      ))}
    </>
  );
}
