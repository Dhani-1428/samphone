import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredApiJwt } from "@/config/samphone";
import { fetchAdminProductList, patchAdminProduct } from "@/lib/samphone-cloud";
import { useAuth } from "@/contexts/AuthContext";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminProducts() {
  const { user } = useAuth();
  const token = getStoredApiJwt() ?? user?.token ?? "";
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editId, setEditId] = useState("");
  const [retail, setRetail] = useState("");
  const [wholesale, setWholesale] = useState("");

  const load = async (query: string) => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchAdminProductList(query, 60);
      setItems(data.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const save = async () => {
    if (!editId.trim() || !token) return;
    setErr(null);
    try {
      await patchAdminProduct(token, editId.trim(), {
        retailPrice: retail ? Number(retail) : null,
        regularPrice: wholesale ? Number(wholesale) : null,
      });
      setEditId("");
      setRetail("");
      setWholesale("");
      await load(q);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save product.");
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <AdminShell title="Products">
      <h1 className="font-display text-2xl font-bold text-navy">Products</h1>
      <p className="mt-1 text-sm text-neutral-500">Search by name, then set public and wholesale prices.</p>

      <form
        className="mt-4 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-11 bg-white" />
        <Button type="submit" className="h-11 bg-brand text-white hover:bg-brand-dark" disabled={busy}>
          {busy ? "…" : "Search"}
        </Button>
      </form>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[0.05] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const id = String(p.id ?? p.wc_id ?? "");
              const title = String(p.title ?? p.name ?? id);
              return (
                <tr key={id} className="border-b border-black/[0.04]">
                  <td className="px-4 py-3 font-medium text-navy">{title}</td>
                  <td className="px-4 py-3 text-neutral-500">{String(p.sku || "—")}</td>
                  <td className="px-4 py-3">{p.price != null ? `€${p.price}` : "—"}</td>
                  <td className="px-4 py-3">{p.stock_quantity != null ? String(p.stock_quantity) : p.in_stock ? "In stock" : "—"}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setEditId(id);
                        setRetail(String(p.retailPrice ?? p.price ?? ""));
                        setWholesale(String(p.wholesalePrice ?? p.regularPrice ?? ""));
                      }}
                    >
                      Edit price
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !busy ? <p className="px-4 py-8 text-sm text-neutral-500">No products found.</p> : null}
      </div>

      {editId ? (
        <div className="mt-4 max-w-lg rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-navy">Edit {editId}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Public €</label>
              <Input className="mt-1" value={retail} onChange={(e) => setRetail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Wholesale €</label>
              <Input className="mt-1" value={wholesale} onChange={(e) => setWholesale(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" className="bg-brand text-white hover:bg-brand-dark" onClick={() => void save()}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditId("")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
