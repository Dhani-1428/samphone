import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredApiJwt } from "@/config/samphone";
import {
  createAdminUserDiscount,
  fetchAdminUserDiscounts,
  fetchAdminUsers,
  type AdminWholesaleUser,
} from "@/lib/samphone-cloud";

type Tab = "product" | "category" | "customers" | "vat" | "history";

type DiscountRow = {
  id: string;
  applies: string;
  target: string;
  type: string;
  value: number | null;
  active: boolean;
  createdAt: string;
};

const PT_VAT = [
  { id: "pt-23", code: "PT23", name: "IVA normal (Portugal)", rate: 0.23 },
  { id: "pt-13", code: "PT13", name: "IVA intermédia", rate: 0.13 },
  { id: "pt-6", code: "PT6", name: "IVA reduzida", rate: 0.06 },
];

function asDiscount(row: unknown): DiscountRow | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const ids = o.target_ids ?? o.targetIds;
  const targets = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
  const valueRaw = o.discount_value ?? o.discountValue;
  const n = typeof valueRaw === "number" ? valueRaw : Number(valueRaw);
  return {
    id: String(o.id ?? ""),
    applies: String(o.applies_to ?? o.appliesTo ?? "all").toLowerCase(),
    target: targets.join(", "),
    type: String(o.discount_type ?? o.discountType ?? ""),
    value: Number.isFinite(n) ? n : null,
    active: o.is_active !== false && o.isActive !== false,
    createdAt: String(o.created_at ?? o.createdAt ?? ""),
  };
}

function ruleValue(r: DiscountRow): string {
  if (r.value == null) return "—";
  return r.type === "percentage" ? `${r.value}%` : `€${r.value.toFixed(2)}`;
}

export default function AdminPricing() {
  const { user } = useAuth();
  const token = getStoredApiJwt() || user?.token || "";
  const [tab, setTab] = useState<Tab>("product");
  const [customers, setCustomers] = useState<AdminWholesaleUser[]>([]);
  const [customerQ, setCustomerQ] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [rules, setRules] = useState<DiscountRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [targetId, setTargetId] = useState("");
  const [percent, setPercent] = useState("");
  const [fixedEur, setFixedEur] = useState("");
  const [ruleType, setRuleType] = useState<"percentage" | "fixed">("percentage");

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const items = await fetchAdminUsers(token);
      setCustomers(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load customers.");
    } finally {
      setBusy(false);
    }
  }, [token]);

  const loadRules = useCallback(async () => {
    if (!token || !selectedCustomer) {
      setRules([]);
      return;
    }
    setError(null);
    try {
      const data = await fetchAdminUserDiscounts(token, selectedCustomer);
      setRules(data.items.map(asDiscount).filter((r): r is DiscountRow => Boolean(r?.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load discounts.");
    }
  }, [token, selectedCustomer]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const filteredCustomers = useMemo(() => {
    const q = customerQ.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q));
  }, [customers, customerQ]);

  const productRules = rules.filter((r) => r.applies === "product");
  const categoryRules = rules.filter((r) => r.applies === "category" || r.applies === "all");

  const addRule = async (scope: "product" | "category") => {
    if (!token || !selectedCustomer) {
      setError("Select a customer first.");
      return;
    }
    const target = targetId.trim();
    if (!target) {
      setError(scope === "product" ? "Enter a product ID." : "Enter a category slug or name.");
      return;
    }
    const value = ruleType === "percentage" ? Number(percent) : Number(fixedEur);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a discount value greater than 0.");
      return;
    }
    setError(null);
    try {
      await createAdminUserDiscount(token, selectedCustomer, {
        discount_type: ruleType,
        discount_value: value,
        applies_to: scope,
        target_ids: [target],
        is_active: true,
      });
      setTargetId("");
      setPercent("");
      setFixedEur("");
      await loadRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save discount.");
    }
  };

  const tabs: [Tab, string][] = [
    ["product", "Product pricing"],
    ["category", "Category discounts"],
    ["customers", "Customers"],
    ["vat", "IVA / VAT"],
    ["history", "Audit log"],
  ];

  if (!token) {
    return (
      <AdminShell title="Pricing & discounts">
        <div className="mx-auto max-w-md rounded-2xl border border-black/[0.05] bg-white p-8 shadow-sm space-y-4">
          <h1 className="text-xl font-bold text-navy">Sign in required</h1>
          <p className="text-sm text-muted-foreground">
            Pricing and discounts use the same admin session as B2B / B2C. Sign in, then open this page again.
          </p>
          <Link href="/login" className="text-sm font-semibold text-brand">
            Go to login
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Pricing & discounts">
      <h1 className="font-display text-2xl font-bold text-navy">Pricing & discounts</h1>
      <p className="mt-1 text-sm text-neutral-500">Per-customer product and category discounts · Portugal · EUR</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="h-fit space-y-1 rounded-xl border bg-card p-3">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                tab === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="min-h-[480px] rounded-xl border bg-card p-6 shadow-sm">
          {error ? (
            <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          ) : null}

          {tab !== "vat" ? (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Search customer</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} />
                  <Button type="button" variant="secondary" onClick={() => void loadCustomers()} disabled={busy}>
                    {busy ? "…" : "Refresh"}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Active customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.email} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {tab === "product" || tab === "category" ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">
                {tab === "product" ? "Customer product prices" : "Category discounts"}
              </h2>
              <div className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>{tab === "product" ? "Product ID" : "Category slug or name"}</Label>
                  <Input className="mt-1" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
                </div>
                <div>
                  <Label>Rule type</Label>
                  <Select value={ruleType} onValueChange={(v) => setRuleType(v as typeof ruleType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">% discount</SelectItem>
                      <SelectItem value="fixed">Fixed € off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ruleType === "percentage" ? (
                  <div>
                    <Label>Discount %</Label>
                    <Input className="mt-1" value={percent} onChange={(e) => setPercent(e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <Label>Amount € off</Label>
                    <Input className="mt-1" value={fixedEur} onChange={(e) => setFixedEur(e.target.value)} />
                  </div>
                )}
                <div className="flex items-end">
                  <Button type="button" className="w-full" onClick={() => void addRule(tab)}>
                    Add rule
                  </Button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">{tab === "product" ? "Product" : "Category"}</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "product" ? productRules : categoryRules).map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2">{r.target || r.applies}</td>
                      <td className="py-2">{r.type}</td>
                      <td className="py-2">{ruleValue(r)}</td>
                      <td className="py-2">{r.active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(tab === "product" ? productRules : categoryRules).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer ? "No rules for this customer yet." : "Select a customer to see and add rules."}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "customers" ? (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Customers</h2>
              <ul className="divide-y">
                {filteredCustomers.map((c) => (
                  <li key={c.id} className="flex justify-between py-3 text-sm">
                    <span>
                      <strong>{c.name || c.email}</strong>
                      <br />
                      <span className="text-muted-foreground">{c.email}</span>
                    </span>
                    <span className="text-muted-foreground capitalize">{c.accountType || c.wholesaleStatus || "—"}</span>
                  </li>
                ))}
              </ul>
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{busy ? "Loading…" : "No customers found."}</p>
              ) : null}
            </div>
          ) : null}

          {tab === "vat" ? (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Portuguese IVA rules</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {PT_VAT.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 font-mono">{v.code}</td>
                      <td className="py-2">{v.name}</td>
                      <td className="py-2">{(v.rate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "history" ? (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Pricing audit log</h2>
              <ul className="space-y-2 font-mono text-sm">
                {rules.map((h) => (
                  <li key={h.id} className="rounded border px-2 py-1.5">
                    {h.createdAt ? new Date(h.createdAt).toLocaleString("pt-PT") : "—"} · {h.applies} · {ruleValue(h)}
                    {h.target ? ` · ${h.target}` : ""}
                  </li>
                ))}
              </ul>
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer
                    ? "No discount history for this customer yet."
                    : "Select a customer to see their discount history."}
                </p>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </AdminShell>
  );
}
