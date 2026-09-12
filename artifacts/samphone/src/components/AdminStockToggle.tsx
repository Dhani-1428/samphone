import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
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

  const label = on ? t("product_in_stock") : t("pdp_out_of_stock");

  if (!admin || !productId) {
    return (
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", on ? "text-emerald-700" : "text-amber-700", className)}>
        {label}
      </span>
    );
  }

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setOn(next);
    const qty = next ? Math.max(1, stockQuantity || 0) : 0;
    try {
      await editAdminProduct(productId, { in_stock: next, stock_quantity: qty });
      onChanged?.({ inStock: next, stockQuantity: qty });
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <label
      className={cn("inline-flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Switch checked={on} disabled={busy} onCheckedChange={(v) => void toggle(Boolean(v))} />
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", on ? "text-emerald-700" : "text-amber-700")}>
        {label}
      </span>
    </label>
  );
}
