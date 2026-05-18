import { useCallback, useEffect, useState } from "react";
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

const API_BASE = (import.meta.env.VITE_PRICING_API_URL ?? "/api").replace(/\/$/, "");

type Customer = { id: string; email: string; name: string; customerType: string };
type ProductPriceRule = {
  id: string;
  customerId: string;
  wooProductId?: number | null;
  ruleType: string;
  fixedPriceCents?: number | null;
  percentBps?: number | null;
  isActive: boolean;
};
type CategoryRule = {
  id: string;
  customerId: string;
  categoryId: string;
  ruleType: string;
  percentBps?: number | null;
  isActive: boolean;
};
type VatRule = { id: string; code: string; name: string; rate: number };

function adminHeaders(): HeadersInit {
  const token = import.meta.env.VITE_PRICING_ADMIN_TOKEN ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    "X-Admin-Token": token,
  };
}

export default function AdminPricing() {
  const [authed, setAuthed] = useState(Boolean(import.meta.env.VITE_PRICING_ADMIN_TOKEN));
  const [tokenInput, setTokenInput] = useState("");
  const [adminToken, setAdminToken] = useState(import.meta.env.VITE_PRICING_ADMIN_TOKEN ?? "");

  const [tab, setTab] = useState<"product" | "category" | "customers" | "vat" | "history">("product");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQ, setCustomerQ] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [productRules, setProductRules] = useState<ProductPriceRule[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [vatRules, setVatRules] = useState<VatRule[]>([]);
  const [history, setHistory] = useState<{ id: string; action: string; entityType: string; createdAt: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [wooProductId, setWooProductId] = useState("");
  const [fixedEur, setFixedEur] = useState("");
  const [percent, setPercent] = useState("");
  const [ruleType, setRuleType] = useState<"fixed_price" | "percent_discount">("fixed_price");

  const fetchJson = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { ...adminHeaders(), ...init?.headers, Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || res.statusText);
      }
      return res.json() as Promise<T>;
    },
    [adminToken],
  );

  const loadCustomers = useCallback(async () => {
    const data = await fetchJson<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(customerQ)}`);
    setCustomers(data.items);
  }, [customerQ, fetchJson]);

  const loadProductRules = useCallback(async () => {
    if (!selectedCustomer) return;
    const data = await fetchJson<{ items: ProductPriceRule[] }>(`/customer-pricing/${selectedCustomer}`);
    setProductRules(data.items);
  }, [selectedCustomer, fetchJson]);

  const loadCategoryRules = useCallback(async () => {
    const data = await fetchJson<{ items: CategoryRule[] }>(
      `/customer-category-discounts?customerId=${selectedCustomer}`,
    );
    setCategoryRules(data.items);
  }, [selectedCustomer, fetchJson]);

  const loadVat = useCallback(async () => {
    const data = await fetchJson<{ items: VatRule[] }>("/pricing/vat-rules");
    setVatRules(data.items);
  }, [fetchJson]);

  const loadHistory = useCallback(async () => {
    const data = await fetchJson<{ items: typeof history }>("/pricing-history");
    setHistory(data.items);
  }, [fetchJson]);

  useEffect(() => {
    if (!authed) return;
    void loadCustomers().catch((e) => setError(String(e)));
  }, [authed, loadCustomers]);

  useEffect(() => {
    if (!authed || !selectedCustomer) return;
    void loadProductRules().catch((e) => setError(String(e)));
    void loadCategoryRules().catch((e) => setError(String(e)));
  }, [authed, selectedCustomer, loadProductRules, loadCategoryRules]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "vat") void loadVat().catch((e) => setError(String(e)));
    if (tab === "history") void loadHistory().catch((e) => setError(String(e)));
  }, [authed, tab, loadVat, loadHistory]);

  const addProductRule = async () => {
    if (!selectedCustomer) return;
    const body = {
      customerId: selectedCustomer,
      wooProductId: Number(wooProductId),
      ruleType,
      fixedPriceCents:
        ruleType === "fixed_price" ? Math.round(Number.parseFloat(fixedEur) * 100) : null,
      percentBps: ruleType === "percent_discount" ? Math.round(Number.parseFloat(percent) * 100) : null,
      vatMode: "inclusive" as const,
      isActive: true,
    };
    await fetchJson("/customer-pricing", { method: "POST", body: JSON.stringify(body) });
    setWooProductId("");
    setFixedEur("");
    setPercent("");
    await loadProductRules();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg space-y-4">
          <h1 className="text-xl font-bold">Samphone Pricing Admin</h1>
          <p className="text-sm text-muted-foreground">
            Enter admin API token (set PRICING_ADMIN_TOKEN on API server).
          </p>
          <Label htmlFor="token">Admin token</Label>
          <Input
            id="token"
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setAdminToken(tokenInput);
              setAuthed(true);
            }}
          >
            Sign in
          </Button>
          <Link href="/" className="text-sm text-primary block text-center">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    ["product", "Product pricing"],
    ["category", "Category discounts"],
    ["customers", "Customers"],
    ["vat", "IVA / VAT"],
    ["history", "Audit log"],
  ] as const;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Pricing administration</h1>
            <p className="text-sm text-muted-foreground">Portugal · EUR · Customer-specific B2B/B2C</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              View storefront
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="rounded-xl border bg-card p-3 h-fit space-y-1">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium ${
                tab === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="rounded-xl border bg-card p-6 shadow-sm min-h-[480px]">
          {error ? (
            <p className="text-sm text-destructive mb-4 rounded-lg bg-destructive/10 p-3">{error}</p>
          ) : null}

          <div className="mb-6 grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Search customer</Label>
              <div className="flex gap-2 mt-1">
                <Input value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} />
                <Button type="button" variant="secondary" onClick={() => void loadCustomers()}>
                  Search
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
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {tab === "product" && (
            <div className="space-y-6">
              <h2 className="font-semibold text-lg">Customer product prices</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/40">
                <div>
                  <Label>Woo product ID</Label>
                  <Input className="mt-1" value={wooProductId} onChange={(e) => setWooProductId(e.target.value)} />
                </div>
                <div>
                  <Label>Rule type</Label>
                  <Select value={ruleType} onValueChange={(v) => setRuleType(v as typeof ruleType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_price">Fixed price (€)</SelectItem>
                      <SelectItem value="percent_discount">% discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ruleType === "fixed_price" ? (
                  <div>
                    <Label>Price € (IVA incl.)</Label>
                    <Input className="mt-1" value={fixedEur} onChange={(e) => setFixedEur(e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <Label>Discount %</Label>
                    <Input className="mt-1" value={percent} onChange={(e) => setPercent(e.target.value)} />
                  </div>
                )}
                <div className="flex items-end">
                  <Button type="button" className="w-full" onClick={() => void addProductRule()}>
                    Add rule
                  </Button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2">Woo ID</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {productRules.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2">{r.wooProductId ?? "—"}</td>
                      <td className="py-2">{r.ruleType}</td>
                      <td className="py-2">
                        {r.fixedPriceCents != null
                          ? `€${(r.fixedPriceCents / 100).toFixed(2)}`
                          : r.percentBps != null
                            ? `${(r.percentBps / 100).toFixed(2)}%`
                            : "—"}
                      </td>
                      <td className="py-2">{r.isActive ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "category" && (
            <div>
              <h2 className="font-semibold text-lg mb-4">Category discounts</h2>
              <ul className="space-y-2 text-sm">
                {categoryRules.map((r) => (
                  <li key={r.id} className="rounded-lg border px-3 py-2 flex justify-between">
                    <span>Category {r.categoryId.slice(0, 8)}…</span>
                    <span>
                      {r.percentBps != null ? `${(r.percentBps / 100).toFixed(2)}%` : "fixed"} ·{" "}
                      {r.isActive ? "active" : "off"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "customers" && (
            <div>
              <h2 className="font-semibold text-lg mb-4">Customers</h2>
              <ul className="divide-y">
                {customers.map((c) => (
                  <li key={c.id} className="py-3 flex justify-between text-sm">
                    <span>
                      <strong>{c.name}</strong>
                      <br />
                      <span className="text-muted-foreground">{c.email}</span>
                    </span>
                    <span className="text-muted-foreground capitalize">{c.customerType}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "vat" && (
            <div>
              <h2 className="font-semibold text-lg mb-4">Portuguese IVA rules</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2">Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {vatRules.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 font-mono">{v.code}</td>
                      <td className="py-2">{v.name}</td>
                      <td className="py-2">{(v.rate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "history" && (
            <div>
              <h2 className="font-semibold text-lg mb-4">Pricing audit log</h2>
              <ul className="space-y-2 text-sm font-mono">
                {history.map((h) => (
                  <li key={h.id} className="rounded border px-2 py-1.5">
                    {new Date(h.createdAt).toLocaleString("pt-PT")} · {h.action} · {h.entityType}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

