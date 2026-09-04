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
import { DEALER_TIER_DISCOUNT_PERCENT } from "@/lib/customer-price";

const TIERS = ["bronze", "standard", "silver", "gold", "platinum"] as const;

export default function AdminWholesale() {
  const { user } = useAuth();
  const [token, setToken] = useState(() => getStoredApiJwt() ?? "");
  const [authed, setAuthed] = useState(Boolean(token));
  const [users, setUsers] = useState<AdminWholesaleUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [retail, setRetail] = useState("");
  const [wholesale, setWholesale] = useState("");
  const [moq, setMoq] = useState("");
  const [dealerOnly, setDealerOnly] = useState(false);

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
      setUsers([...byId.values()].sort((a, b) => a.email.localeCompare(b.email)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wholesale accounts.");
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  const updateUser = async (id: string, body: Record<string, string | boolean | number>) => {
    setError(null);
    try {
      await patchAdminWholesaleUser(token, id, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
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
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-8 shadow-lg">
          <h1 className="text-xl font-bold">Wholesale admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with an admin Samphone account, or paste the FastAPI admin JWT.
          </p>
          <Label htmlFor="jwt">Admin JWT</Label>
          <Input id="jwt" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              setAuthed(true);
            }}
          >
            Continue
          </Button>
          <Link href="/admin/pricing" className="block text-center text-sm text-primary">
            Pricing rules admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Wholesale administration</h1>
            <p className="text-sm text-muted-foreground">
              Approve B2B accounts, set dealer tier, and edit B2B/B2C prices.
              {user?.email ? ` Signed in as ${user.email}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/pricing">
              <Button variant="outline" size="sm">
                Personal price rules
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
                  <th className="py-2">Tier</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-3">
                      <strong>{row.name}</strong>
                      <div className="text-muted-foreground">{row.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.businessName || row.accountType || "—"} {row.vatNumber ? `· ${row.vatNumber}` : ""}
                      </div>
                    </td>
                    <td className="py-3 capitalize">{row.wholesaleStatus || (row.isWholesale ? "approved" : "—")}</td>
                    <td className="py-3">
                      <select
                        className="rounded-md border bg-background px-2 py-1"
                        value={(row.dealerTier || "bronze").toLowerCase()}
                        onChange={(e) =>
                          void updateUser(row.id, { dealerTier: e.target.value, dealer_tier: e.target.value })
                        }
                      >
                        {TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier} (−{DEALER_TIER_DISCOUNT_PERCENT[tier]}%)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
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
      </main>
    </div>
  );
}
