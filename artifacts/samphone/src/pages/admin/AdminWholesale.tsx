import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredApiJwt } from "@/config/samphone";
import {
  fetchAdminUsers,
  fetchAdminWholesaleRequests,
  patchAdminProduct,
  patchAdminWholesaleUser,
  type AdminWholesaleUser,
} from "@/lib/samphone-cloud";
import type { PersonalPricingRule } from "@/lib/customer-price";

type DraftRule = {
  scope: "product" | "category";
  target: string;
  percent: string;
  fixedEur: string;
};

const EMPTY_DRAFT: DraftRule = { scope: "product", target: "", percent: "", fixedEur: "" };

function ruleLabel(rule: PersonalPricingRule): string {
  if (rule.wooProductId) return `Product #${rule.wooProductId}`;
  if (rule.productId) return `Product ${rule.productId}`;
  if (rule.categorySlug) return `Category ${rule.categorySlug}`;
  if (rule.categoryName) return `Category ${rule.categoryName}`;
  if (rule.categoryId) return `Category ${rule.categoryId}`;
  return "All products";
}

function ruleValue(rule: PersonalPricingRule): string {
  if (rule.fixedEur != null) return `€${rule.fixedEur.toFixed(2)}`;
  if (rule.percent != null) return `−${rule.percent}%`;
  return "—";
}

export default function AdminWholesale() {
  const { user } = useAuth();
  const [token, setToken] = useState(() => getStoredApiJwt() ?? user?.token ?? "");
  const [authed, setAuthed] = useState(Boolean(getStoredApiJwt() ?? user?.token));
  const [users, setUsers] = useState<AdminWholesaleUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [retail, setRetail] = useState("");
  const [wholesale, setWholesale] = useState("");
  const [moq, setMoq] = useState("");
  const [dealerOnly, setDealerOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState("");
  const [rulesDraft, setRulesDraft] = useState<PersonalPricingRule[]>([]);
  const [newRule, setNewRule] = useState<DraftRule>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [requests, all] = await Promise.all([
        fetchAdminWholesaleRequests(token).catch(() => [] as AdminWholesaleUser[]),
        fetchAdminUsers(token).catch(() => [] as AdminWholesaleUser[]),
      ]);
      const byId = new Map<string, AdminWholesaleUser>();
      for (const row of [...requests, ...all]) byId.set(row.id || row.email, row);
      const list = [...byId.values()].sort((a, b) => a.email.localeCompare(b.email));
      setUsers(list);
      if (selectedId) {
        const selected = list.find((u) => u.id === selectedId);
        if (selected) {
          setDiscountDraft(
            selected.accountDiscountPercent != null ? String(selected.accountDiscountPercent) : "",
          );
          setRulesDraft(selected.personalPricing ?? []);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wholesale accounts.");
    } finally {
      setBusy(false);
    }
  }, [token, selectedId]);

  useEffect(() => {
    const jwt = getStoredApiJwt() ?? user?.token ?? "";
    if (jwt && jwt !== token) setToken(jwt);
    if (jwt) setAuthed(true);
  }, [token, user?.token]);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  const selectUser = (row: AdminWholesaleUser) => {
    setSelectedId(row.id);
    setDiscountDraft(row.accountDiscountPercent != null ? String(row.accountDiscountPercent) : "");
    setRulesDraft(row.personalPricing ?? []);
    setNewRule(EMPTY_DRAFT);
  };

  const updateUser = async (
    id: string,
    body: Record<string, string | boolean | number | null | PersonalPricingRule[]>,
  ) => {
    setError(null);
    try {
      await patchAdminWholesaleUser(token, id, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const saveAccountPricing = async () => {
    if (!selectedId) return;
    const pctRaw = discountDraft.trim() === "" ? null : Number.parseFloat(discountDraft.replace(",", "."));
    const pct = pctRaw != null && Number.isFinite(pctRaw) ? Math.max(0, Math.min(100, pctRaw)) : null;
    await updateUser(selectedId, {
      accountDiscountPercent: pct,
      account_discount_percent: pct,
      discountPercent: pct,
      discount_percent: pct,
      personalPricing: rulesDraft,
      personal_pricing: rulesDraft,
      // Clear legacy tiers if the API still accepts them.
      dealerTier: "",
      dealer_tier: "",
    });
  };

  const addRule = () => {
    const target = newRule.target.trim();
    if (!target) return;
    const percent = newRule.percent.trim()
      ? Number.parseFloat(newRule.percent.replace(",", "."))
      : undefined;
    const fixedEur = newRule.fixedEur.trim()
      ? Number.parseFloat(newRule.fixedEur.replace(",", "."))
      : undefined;
    if ((percent == null || !Number.isFinite(percent)) && (fixedEur == null || !Number.isFinite(fixedEur))) {
      setError("Enter a percent discount or a fixed € price for the rule.");
      return;
    }
    const rule: PersonalPricingRule = {
      percent: percent != null && Number.isFinite(percent) ? percent : undefined,
      fixedEur: fixedEur != null && Number.isFinite(fixedEur) && fixedEur > 0 ? fixedEur : undefined,
    };
    if (newRule.scope === "product") {
      const asNum = Number.parseInt(target, 10);
      if (Number.isFinite(asNum) && asNum > 0 && String(asNum) === target) {
        rule.wooProductId = asNum;
      } else {
        rule.productId = target;
      }
    } else {
      rule.categorySlug = target.toLowerCase().replace(/\s+/g, "-");
      rule.categoryName = target;
      rule.categoryId = target;
    }
    setRulesDraft((prev) => [...prev, rule]);
    setNewRule(EMPTY_DRAFT);
    setError(null);
  };

  const saveProduct = async () => {
    if (!productId.trim()) return;
    setError(null);
    try {
      await patchAdminProduct(token, productId.trim(), {
        retailPrice: retail ? Number(retail) : null,
        regularPrice: wholesale ? Number(wholesale) : null,
        dealerOnly,
        moq: moq ? Number(moq) : null,
        dealer_only: dealerOnly,
        min_order_qty: moq ? Number(moq) : null,
      });
      setProductId("");
      setRetail("");
      setWholesale("");
      setMoq("");
      setDealerOnly(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Product update failed.");
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Opening wholesale admin…</p>
      </div>
    );
  }

  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Wholesale administration</h1>
            <p className="text-sm text-muted-foreground">
              Approve B2B accounts, set per-account discounts, and edit B2B/B2C prices.
              {user?.email ? ` Signed in as ${user.email}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/catalog">
              <Button variant="outline" size="sm">
                Catalog taxonomy
              </Button>
            </Link>
            <Link href="/admin/pricing">
              <Button variant="outline" size="sm">
                Product / category discounts
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                Storefront
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-4 py-6">
        {error ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Product B2B / B2C prices</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Product id</Label>
              <Input className="mt-1" value={productId} onChange={(e) => setProductId(e.target.value)} />
            </div>
            <div>
              <Label>Public retail €</Label>
              <Input className="mt-1" value={retail} onChange={(e) => setRetail(e.target.value)} />
            </div>
            <div>
              <Label>Wholesale €</Label>
              <Input className="mt-1" value={wholesale} onChange={(e) => setWholesale(e.target.value)} />
            </div>
            <div>
              <Label>MOQ</Label>
              <Input className="mt-1" value={moq} onChange={(e) => setMoq(e.target.value)} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={dealerOnly} onChange={(e) => setDealerOnly(e.target.checked)} />
              Dealer-only
            </label>
          </div>
          <Button className="mt-4" type="button" onClick={() => void saveProduct()}>
            Save product
          </Button>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Accounts</h2>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Account discount</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/60 ${selectedId === row.id ? "bg-brand/5" : ""}`}
                  >
                    <td className="py-3">
                      <button type="button" className="text-left hover:underline" onClick={() => selectUser(row)}>
                        <strong>{row.name}</strong>
                        <div className="text-muted-foreground">{row.email}</div>
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {row.businessName || row.accountType || "—"} {row.vatNumber ? `· ${row.vatNumber}` : ""}
                      </div>
                    </td>
                    <td className="py-3 capitalize">{row.wholesaleStatus || (row.isWholesale ? "approved" : "—")}</td>
                    <td className="py-3">
                      {row.accountDiscountPercent != null && row.accountDiscountPercent > 0
                        ? `−${row.accountDiscountPercent}%`
                        : "—"}
                      {(row.personalPricing?.length ?? 0) > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {row.personalPricing!.length} product/category rule
                          {row.personalPricing!.length === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" type="button" variant="outline" onClick={() => selectUser(row)}>
                          Discounts
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() =>
                            void updateUser(row.id, {
                              wholesaleStatus: "approved",
                              isWholesale: true,
                              wholesale_status: "approved",
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() =>
                            void updateUser(row.id, {
                              wholesaleStatus: "rejected",
                              isWholesale: false,
                              wholesale_status: "rejected",
                            })
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            void updateUser(row.id, {
                              wholesaleStatus: "suspended",
                              isWholesale: false,
                              wholesale_status: "suspended",
                            })
                          }
                        >
                          Suspend
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !busy ? (
              <p className="py-6 text-sm text-muted-foreground">No wholesale requests loaded.</p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Discounts for {selected.name}</h2>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>

            <div className="mb-6 max-w-xs">
              <Label htmlFor="account-discount">Account discount %</Label>
              <Input
                id="account-discount"
                className="mt-1"
                inputMode="decimal"
                placeholder="e.g. 10"
                value={discountDraft}
                onChange={(e) => setDiscountDraft(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Flat percent off this account’s catalog base (retail or wholesale). Leave empty for no account discount.
              </p>
            </div>

            <h3 className="mb-2 text-sm font-semibold">Product & category rules</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Extra discounts for a specific product ID or category (slug/name). These apply on top of the account
              discount. You can also manage rules in{" "}
              <Link href="/admin/pricing" className="text-primary underline">
                Product / category discounts
              </Link>
              .
            </p>

            {rulesDraft.length > 0 ? (
              <ul className="mb-4 divide-y rounded-lg border">
                {rulesDraft.map((rule, idx) => (
                  <li key={`${ruleLabel(rule)}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      <strong>{ruleLabel(rule)}</strong>
                      <span className="ml-2 text-muted-foreground">{ruleValue(rule)}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setRulesDraft((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">No product/category rules yet.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label>Scope</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newRule.scope}
                  onChange={(e) =>
                    setNewRule((d) => ({ ...d, scope: e.target.value === "category" ? "category" : "product" }))
                  }
                >
                  <option value="product">Product</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div>
                <Label>{newRule.scope === "product" ? "Woo / cloud product id" : "Category slug or name"}</Label>
                <Input
                  className="mt-1"
                  value={newRule.target}
                  onChange={(e) => setNewRule((d) => ({ ...d, target: e.target.value }))}
                  placeholder={newRule.scope === "product" ? "12345" : "chargers"}
                />
              </div>
              <div>
                <Label>Discount %</Label>
                <Input
                  className="mt-1"
                  value={newRule.percent}
                  onChange={(e) => setNewRule((d) => ({ ...d, percent: e.target.value }))}
                  placeholder="15"
                />
              </div>
              <div>
                <Label>Or fixed €</Label>
                <Input
                  className="mt-1"
                  value={newRule.fixedEur}
                  onChange={(e) => setNewRule((d) => ({ ...d, fixedEur: e.target.value }))}
                  placeholder="4.90"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" className="w-full" variant="secondary" onClick={addRule}>
                  Add rule
                </Button>
              </div>
            </div>

            <Button className="mt-5" type="button" onClick={() => void saveAccountPricing()}>
              Save account discounts
            </Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
