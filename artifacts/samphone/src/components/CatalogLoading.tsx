import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Always-visible product loading state.
 * Uses a CSS border spinner (not icon-only) so it stays obvious on every page.
 */
export default function CatalogLoading({
  label,
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useLang();
  const text = label ?? t("woo_loading");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="catalog-loading"
      className={cn(
        "catalog-loading flex w-full flex-col items-center justify-center gap-4 bg-white",
        compact ? "min-h-[14rem] py-12" : "min-h-[min(60vh,32rem)] py-24",
        className,
      )}
    >
      <span
        className={cn(
          "catalog-loading__spinner inline-block shrink-0 rounded-full border-4 border-[#243F9F]/20 border-t-[#243F9F]",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
        aria-hidden
      />
      <p className="text-base font-semibold text-[#243F9F]">{text}</p>
    </div>
  );
}
