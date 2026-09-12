import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { isAdminRole } from "@/lib/admin-access";
import { editAdminProduct } from "@/lib/samphone-cloud";
import { cn } from "@/lib/utils";

export default function AdminStockToggle({
  productId,
  inStock,
  stockQuantity = 0,
  className,
  onChanged,
}: {
  productId?: string;
  inStock: boolean;
  stockQuantity?: number;
  className?: string;
  onChanged?: (next: { inStock: boolean; stockQuantity: number }) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const admin = isAdminRole(user?.role);
  const [on, setOn] = useState(inStock);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOn(inStock);
  }, [inStock]);

  const inLabel = t("product_in_stock");
  const outLabel = t("pdp_out_of_stock");

  if (!admin || !productId) {
    return (
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", on ? "text-emerald-700" : "text-amber-700", className)}>
        {on ? inLabel : outLabel}
      </span>
    );
  }

  const choose = async (next: boolean) => {
    if (busy || next === on) return;
    setBusy(true);
    setOn(next);
    const qty = next ? Math.max(1, stockQuantity || 0) : 0;
    onChanged?.({ inStock: next, stockQuantity: qty });
    try {
      await editAdminProduct(productId, { in_stock: next, stock_quantity: qty });
    } catch {
      setOn(!next);
      onChanged?.({ inStock: !next, stockQuantity: !next ? Math.max(1, stockQuantity || 0) : 0 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn("inline-flex rounded-lg bg-[#EEF1F8] p-0.5", className)}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Stock status"
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => void choose(true)}
        className={cn(
          "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
          on ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-500 hover:text-navy",
        )}
      >
        {inLabel}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void choose(false)}
        className={cn(
          "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
          !on ? "bg-white text-amber-700 shadow-sm" : "text-neutral-500 hover:text-navy",
        )}
      >
        {outLabel}
      </button>
    </div>
  );
}
