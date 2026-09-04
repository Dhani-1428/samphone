import { Loader2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/** Centered product-grid loader — use whenever a catalog page or rail is fetching. */
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
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 text-muted-foreground",
        compact ? "min-h-[12rem] py-10" : "min-h-[40vh] py-20",
        className,
      )}
    >
      <Loader2 className={cn("animate-spin text-sam", compact ? "h-8 w-8" : "h-10 w-10")} aria-hidden />
      <p className="text-sm font-medium">{label ?? t("woo_loading")}</p>
    </div>
  );
}
