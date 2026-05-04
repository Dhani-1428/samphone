import { Package } from "lucide-react";
import { getStockLevel } from "@/data/inventory";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function StockBadge({ cartKey, className }: { cartKey: string; className?: string }) {
  const { t } = useLang();
  const { count, isLow } = getStockLevel(cartKey);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        isLow ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Package className="w-3.5 h-3.5 shrink-0" />
      {isLow ? t("stock_low", { count }) : t("stock_in", { count })}
    </div>
  );
}
