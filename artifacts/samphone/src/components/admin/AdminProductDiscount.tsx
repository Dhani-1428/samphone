import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAdminUserDiscount, type AdminWholesaleUser } from "@/lib/samphone-cloud";

export default function AdminProductDiscount({
  token,
  customers,
  productId,
  categoryHint,
}: {
  token: string;
  customers: AdminWholesaleUser[];
  productId: string;
  categoryHint: string;
}) {
  const [customerId, setCustomerId] = useState("");
  const [scope, setScope] = useState<"product" | "category">("product");
  const [percent, setPercent] = useState("");
  const [fixedEur, setFixedEur] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMsg(null);
    setErr(null);
  }, [productId]);

  const apply = async () => {
    setMsg(null);
    setErr(null);
    if (!customerId) {
      setErr("Select a customer.");
      return;
    }
    const target = scope === "product" ? productId : categoryHint.trim();
    if (!target) {
      setErr(scope === "product" ? "This product has no ID yet. Save it first." : "This product has no category.");
      return;
    }
    const pct = Number(String(percent).replace(",", "."));
    const eur = Number(String(fixedEur).replace(",", "."));
    const usePct = Number.isFinite(pct) && pct > 0;
    const useEur = Number.isFinite(eur) && eur > 0;
    if (!usePct && !useEur) {
      setErr("Enter a percent or a euro amount.");
      return;
    }
    if (usePct && useEur) {
      setErr("Enter a percent or a euro amount, not both.");
      return;
    }
    setBusy(true);
    try {
      await createAdminUserDiscount(token, customerId, {
        discount_type: usePct ? "percentage" : "fixed",
        discount_value: usePct ? pct : eur,
        applies_to: scope,
        target_ids: [target],
        is_active: true,
      });
      setPercent("");
      setFixedEur("");
      setMsg("Discount saved for that customer.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save discount.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#F7F8FC] p-3 sm:col-span-2">
      <p className="text-xs font-bold uppercase tracking-wide text-navy">Customer discount</p>
      <p className="mt-1 text-xs text-neutral-500">Pick a customer, then this product or its category.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Customer</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.email} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Apply to</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value === "category" ? "category" : "product")}
          >
            <option value="product">This product</option>
            <option value="category" disabled={!categoryHint}>
              {categoryHint ? `Category: ${categoryHint}` : "Category (none on this product)"}
            </option>
          </select>
        </div>
        <div>
          <Label>Discount %</Label>
          <Input className="mt-1 bg-white" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="10" inputMode="decimal" />
        </div>
        <div>
          <Label>Or amount € off</Label>
          <Input className="mt-1 bg-white" value={fixedEur} onChange={(e) => setFixedEur(e.target.value)} placeholder="4.90" inputMode="decimal" />
        </div>
        <div className="flex items-end">
          <Button type="button" className="w-full bg-sam text-white hover:bg-sam-dark" disabled={busy} onClick={() => void apply()}>
            {busy ? "…" : "Give discount"}
          </Button>
        </div>
      </div>
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
    </div>
  );
}
