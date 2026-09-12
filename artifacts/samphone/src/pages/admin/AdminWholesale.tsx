import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Pencil, Trash2, Ban, Check } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredApiJwt } from "@/config/samphone";
import {
  fetchAdminUsers,
  fetchAdminWebsiteCustomers,
  fetchAdminWholesaleRequests,
  fetchAdminUserDiscounts,
  patchAdminProduct,
  patchAdminWholesaleUser,
  deleteAdminUser,
  type AdminWholesaleUser,
} from "@/lib/samphone-cloud";
import { isB2bAccount, isB2cAccount } from "@/lib/admin-access";
import { parsePersonalPricing, type PersonalPricingRule } from "@/lib/customer-price";
import AdminRecordDialog from "@/components/admin/AdminRecordDialog";

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

function sourceLabel(row: AdminWholesaleUser): string {
  const id = row.id || "";
  if (row.source === "website" || id.startsWith("wp-")) return "samphone.pt";
  if (row.source === "clerk" || id.startsWith("user_")) return "Clerk";
  if (row.source === "app") return "App";
  return "Clerk";
}

function canManageAccount(row: AdminWholesaleUser): boolean {
  const id = row.id || "";
  const email = (row.email || "").trim().toLowerCase();
  if ((row.role || "").toLowerCase() === "admin" || email === "samphone.pt@gmail.com") return false;
  if (id.startsWith("wp-")) return true;
  return Boolean(id || email);
}

function formatJoined(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(raw?: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return raw || "";
  if (digits.startsWith("351") && digits.length >= 12) {
    return `+351 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 9) return `+351 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return raw?.trim() || "";
}

function formatStatus(row: AdminWholesaleUser): string {
  const status = (row.wholesaleStatus || "").trim().toLowerCase();
  if (status) return status;
  if (row.isWholesale) return "approved";
  return (row.accountType || "b2c").toLowerCase() === "b2b" ? "pending" : "personal";
}

function formatPercent(n?: number): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `−${Number.isInteger(n) ? String(n) : n.toFixed(2)}%`;
}

function pickText(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function mergeAccount(prev: AdminWholesaleUser, row: AdminWholesaleUser): AdminWholesaleUser {
  const appId = (id: string) => id && !id.startsWith("user_") && !id.startsWith("wp-");
  const prevLooksLikeEmail = (prev.name || "").toLowerCase() === (prev.email || "").split("@")[0];
  return {
    ...row,
    ...prev,
    id: appId(prev.id) ? prev.id : row.id || prev.id,
    email: pickText(prev.email, row.email),
    name: prevLooksLikeEmail && row.name ? row.name : pickText(prev.name, row.name),
    phone: pickText(prev.phone, row.phone),
    businessName: pickText(prev.businessName, row.businessName),
    vatNumber: pickText(prev.vatNumber, row.vatNumber),
    businessType: pickText(prev.businessType, row.businessType),
    companyAddress: pickText(prev.companyAddress, row.companyAddress),
    createdAt: prev.createdAt || row.createdAt,
    wholesaleStatus: prev.wholesaleStatus || row.wholesaleStatus,
    accountType: isB2bAccount(prev) || isB2bAccount(row) ? "b2b" : prev.accountType || row.accountType || "b2c",
    accountDiscountPercent: prev.accountDiscountPercent ?? row.accountDiscountPercent,
    personalPricing: prev.personalPricing?.length ? prev.personalPricing : row.personalPricing,
    source: prev.source || row.source,
    isWholesale: Boolean(prev.isWholesale || row.isWholesale),
    isWholesaleRole: Boolean(prev.isWholesaleRole || row.isWholesaleRole),
    role: prev.role || row.role,
  };
}

export default function AdminWholesale({
  lane = "b2b",
  embedded = false,
}: {
  lane?: "b2b" | "b2c";
  embedded?: boolean;
}) {
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
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [businessDraft, setBusinessDraft] = useState("");
  const [vatDraft, setVatDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [rulesDraft, setRulesDraft] = useState<PersonalPricingRule[]>([]);
  const [newRule, setNewRule] = useState<DraftRule>(EMPTY_DRAFT);
  const search = useSearch();
  const qFromUrl = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("q") || "";
  const [filter, setFilter] = useState(qFromUrl);

  useEffect(() => {
    setFilter(qFromUrl);
  }, [qFromUrl]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const settled = await Promise.allSettled([
        fetchAdminWholesaleRequests(token),
        fetchAdminUsers(token),
        lane === "b2b" ? fetchAdminWebsiteCustomers(token) : Promise.resolve([] as AdminWholesaleUser[]),
      ]);
      const pick = (row: PromiseSettledResult<AdminWholesaleUser[]>): AdminWholesaleUser[] =>
        row.status === "fulfilled" ? row.value : [];
      const requests = pick(settled[0]);
      const all = pick(settled[1]);
      const website = pick(settled[2]);
      const failed = settled.filter((row) => row.status === "rejected") as PromiseRejectedResult[];
      if (all.length === 0 && requests.length === 0 && website.length === 0 && failed.length) {
        const first = failed[0].reason;
        throw first instanceof Error ? first : new Error("Could not load accounts.");
      }
      const byEmail = new Map<string, AdminWholesaleUser>();
      for (const row of [...all, ...requests, ...website]) {
        const key = (row.email || row.id).trim().toLowerCase();
        const prev = byEmail.get(key);
        if (!prev) {
          byEmail.set(key, row);
          continue;
        }
        byEmail.set(key, mergeAccount(prev, row));
      }
      const list = [...byEmail.values()].sort((a, b) => {
        const da = a.createdAt || "";
        const db = b.createdAt || "";
        if (da !== db) return db.localeCompare(da);
        return a.email.localeCompare(b.email);
      });
      setUsers(list);
      if (selectedId) {
        const selected = list.find((u) => u.id === selectedId);
        if (selected) {
          setDiscountDraft(
            selected.accountDiscountPercent != null ? String(selected.accountDiscountPercent) : "",
          );
          setNameDraft(selected.name || "");
          setPhoneDraft(selected.phone || "");
          setBusinessDraft(selected.businessName || "");
          setVatDraft(selected.vatNumber || "");
          setAddressDraft(selected.companyAddress || "");
          setRulesDraft(selected.personalPricing ?? []);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wholesale accounts.");
    } finally {
      setBusy(false);
    }
  }, [token, selectedId, lane]);

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
    setDiscountDraft(
      row.accountDiscountPercent != null && row.accountDiscountPercent > 0
        ? String(Number.isInteger(row.accountDiscountPercent) ? row.accountDiscountPercent : row.accountDiscountPercent.toFixed(2))
        : "",
    );
    setNameDraft(row.name || "");
    setPhoneDraft(formatPhone(row.phone) || row.phone || "");
    setBusinessDraft(row.businessName || "");
    setVatDraft(row.vatNumber || "");
    setAddressDraft(row.companyAddress || "");
    setRulesDraft(row.personalPricing ?? []);
    setNewRule(EMPTY_DRAFT);
    void (async () => {
      try {
        const disc = await fetchAdminUserDiscounts(token, row.id);
        const rules = parsePersonalPricing(disc.items);
        if (rules.length) setRulesDraft(rules);
      } catch {
        /* list data already shown */
      }
    })();
  };

  const updateUser = async (
    id: string,
    body: Record<string, string | boolean | number | null | PersonalPricingRule[]>,
    email?: string,
  ) => {
    setError(null);
    try {
      const row = users.find((u) => u.id === id);
      await patchAdminWholesaleUser(token, id, {
        ...body,
        email: email || row?.email || "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const suspendUser = async (row: AdminWholesaleUser) => {
    const status = (row.wholesaleStatus || "").toLowerCase();
    const next = status === "suspended" ? "approved" : "suspended";
    const label = next === "suspended" ? "Suspend this B2B account?" : "Restore this account to approved?";
    if (!window.confirm(label)) return;
    await updateUser(
      row.id,
      {
        wholesaleStatus: next,
        isWholesale: next === "approved",
        wholesale_status: next,
        email: row.email,
      },
      row.email,
    );
  };

  const removeUser = async (row: AdminWholesaleUser) => {
    if ((row.id || "").startsWith("wp-")) {
      setError("samphone.pt accounts must be removed in WordPress. Suspend them here instead.");
      return;
    }
    if (!window.confirm(`Delete ${row.email || row.name}? This removes the shop login.`)) return;
    setError(null);
    try {
      await deleteAdminUser(token, row.id, row.email);
      if (selectedId === row.id) setSelectedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const saveAccountPricing = async () => {
    if (!selectedId) return;
    const pctRaw = discountDraft.trim() === "" ? null : Number.parseFloat(discountDraft.replace(",", "."));
    const pct = pctRaw != null && Number.isFinite(pctRaw) ? Math.max(0, Math.min(100, pctRaw)) : null;
    await updateUser(selectedId, {
      email: users.find((u) => u.id === selectedId)?.email || "",
      name: nameDraft,
      phone: phoneDraft,
      businessName: businessDraft,
      business_name: businessDraft,
      vatNumber: vatDraft,
      vat_number: vatDraft,
      companyAddress: addressDraft,
      company_address: addressDraft,
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

  const pendingCount = users.filter(
    (u) => isB2bAccount(u) && (u.wholesaleStatus || "").toLowerCase() === "pending",
  ).length;
  const visible = useMemo(() => {
    const inLane = users.filter((u) => (lane === "b2b" ? isB2bAccount(u) : isB2cAccount(u)));
    const laneRows = inLane.length > 0 || users.length === 0 ? inLane : users;
    const q = filter.trim().toLowerCase();
    if (!q) return laneRows;
    return laneRows.filter((row) =>
      [row.name, row.email, row.businessName, row.vatNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [users, filter, lane]);

  if (!authed) {
    const wait = <p className="text-sm text-neutral-500">Opening accounts…</p>;
    return embedded ? wait : <AdminShell title={lane === "b2b" ? "B2B" : "B2C"}>{wait}</AdminShell>;
  }

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const body = (
    <>
      {embedded ? null : (
        <>
          <h1 className="font-display text-2xl font-bold text-navy">
            {lane === "b2b" ? "B2B accounts" : "B2C accounts"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {lane === "b2b"
              ? "Business registrations. Pending, rejected, or suspended stay B2B."
              : "Personal Clerk accounts only. Unapproved B2B is not listed here."}{" "}
            Signed in as {user?.email || "admin"}.
          </p>
        </>
      )}

      <div className={embedded ? "space-y-8" : "mt-6 space-y-8"}>
        {error ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{lane === "b2b" ? "B2B accounts" : "B2C accounts"}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-9 w-56 bg-white"
                placeholder="Search by name or email…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Joined</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Account discount</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-b border-border/60 hover:bg-[#F7F8FC] ${selectedId === row.id ? "bg-brand/5" : ""}`}
                    onClick={() => selectUser(row)}
                  >
                    <td className="py-3">
                      <strong>{row.name}</strong>
                      <div className="text-muted-foreground">{row.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {pickText(row.businessName, row.accountType, row.role) || "—"}
                        {row.vatNumber ? ` · ${row.vatNumber}` : ""}
                        {row.phone ? ` · ${formatPhone(row.phone)}` : ""} · {sourceLabel(row)}
                      </div>
                    </td>
                    <td className="py-3 whitespace-nowrap text-muted-foreground">{formatJoined(row.createdAt)}</td>
                    <td className="py-3 capitalize">{formatStatus(row)}</td>
                    <td className="py-3 tabular-nums">
                      {formatPercent(row.accountDiscountPercent)}
                      {(row.personalPricing?.length ?? 0) > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {row.personalPricing!.length} product/category rule
                          {row.personalPricing!.length === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {lane === "b2b" && canManageAccount(row) && (row.wholesaleStatus || "").toLowerCase() === "pending" ? (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                            aria-label="Approve account"
                            title="Approve"
                            onClick={() =>
                              void updateUser(
                                row.id,
                                {
                                  wholesaleStatus: "approved",
                                  isWholesale: true,
                                  wholesale_status: "approved",
                                  email: row.email,
                                },
                                row.email,
                              )
                            }
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-lg p-2 text-brand hover:bg-brand/10"
                          aria-label="Open account"
                          title="Open"
                          onClick={() => selectUser(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {lane === "b2b" && canManageAccount(row) ? (
                          <>
                            <button
                              type="button"
                              className={`rounded-lg p-2 hover:bg-amber-50 ${
                                (row.wholesaleStatus || "").toLowerCase() === "suspended"
                                  ? "text-amber-700"
                                  : "text-amber-600"
                              }`}
                              aria-label={
                                (row.wholesaleStatus || "").toLowerCase() === "suspended"
                                  ? "Unsuspend account"
                                  : "Suspend account"
                              }
                              title={
                                (row.wholesaleStatus || "").toLowerCase() === "suspended"
                                  ? "Unsuspend"
                                  : "Suspend"
                              }
                              onClick={() => void suspendUser(row)}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              aria-label="Delete account"
                              title="Delete"
                              onClick={() => void removeUser(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && !busy ? (
              <p className="py-6 text-sm text-muted-foreground">
                {users.length === 0
                  ? "No accounts loaded."
                  : lane === "b2b"
                    ? "No business accounts match that search."
                    : "No personal Clerk accounts match. Unapproved B2B dealers are listed under B2B only."}
              </p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <AdminRecordDialog
            title={selected.name || selected.email}
            subtitle={`${selected.email} · ${sourceLabel(selected)} · ${formatStatus(selected)} · joined ${formatJoined(selected.createdAt)}`}
            onClose={() => setSelectedId(null)}
            footer={
              <>
                <Button type="button" className="bg-brand text-white hover:bg-brand-dark" onClick={() => void saveAccountPricing()}>
                  Save account
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="acct-name">Name</Label>
                <Input id="acct-name" className="mt-1" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="acct-phone">Phone</Label>
                <Input id="acct-phone" className="mt-1" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="acct-biz">Business name</Label>
                <Input
                  id="acct-biz"
                  className="mt-1"
                  value={businessDraft}
                  onChange={(e) => setBusinessDraft(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="acct-vat">VAT</Label>
                <Input id="acct-vat" className="mt-1" value={vatDraft} onChange={(e) => setVatDraft(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="acct-addr">Company address</Label>
                <Input
                  id="acct-addr"
                  className="mt-1"
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                />
              </div>
            </div>

            <div className="max-w-xs">
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
                Flat percent off this account’s catalog base. Leave empty for no account discount.
              </p>
            </div>

            <div>
            <h3 className="mb-2 text-sm font-semibold">Product & category rules</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Extra discount for a product ID or a category. You can also set this from the product edit screen.
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
            </div>
          </AdminRecordDialog>
        ) : null}
      </div>
    </>
  );

  if (embedded) return body;
  return (
    <AdminShell title={lane === "b2b" ? "B2B" : "B2C"} pendingCustomers={pendingCount}>
      {body}
    </AdminShell>
  );
}
