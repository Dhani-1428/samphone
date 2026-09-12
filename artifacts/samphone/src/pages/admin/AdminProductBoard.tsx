import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeCatalogImageUrl } from "@/config/samphone";
import {
  createAdminProduct,
  deleteAdminProduct,
  editAdminProduct,
  fetchAdminProductList,
} from "@/lib/samphone-cloud";

type Channel = "b2b" | "b2c";

function money(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function productImage(p: Record<string, unknown>): string {
  if (typeof p.image === "string" && p.image) return normalizeCatalogImageUrl(p.image) || p.image;
  const imgs = p.images;
  if (Array.isArray(imgs) && imgs[0]) {
    const first = imgs[0];
    if (typeof first === "string") return normalizeCatalogImageUrl(first) || first;
    if (first && typeof first === "object") {
      const src = String((first as { src?: string }).src || "");
      return normalizeCatalogImageUrl(src) || src;
    }
  }
  return "";
}

function b2bPrice(p: Record<string, unknown>): string {
  const n = Number(p.wholesalePrice ?? p.b2b_price ?? p.regularPrice ?? p.price ?? "");
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

function b2cPrice(p: Record<string, unknown>): string {
  const n = Number(p.retailPrice ?? p.b2c_price ?? "");
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

export default function AdminProductBoard({
  channel,
  openAdd = false,
}: {
  channel: Channel;
  openAdd?: boolean;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(openAdd);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState("");
  const [b2b, setB2b] = useState("");
  const [b2c, setB2c] = useState("");

  const load = async (query: string, offset = 0, append = false) => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchAdminProductList(query, 80, offset);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(Boolean(data.has_more) || (data.total != null && offset + data.items.length < data.total));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  useEffect(() => {
    if (openAdd) setFormOpen(true);
  }, [openAdd]);

  const resetForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setName("");
    setSku("");
    setImageUrl("");
    setStock("");
    setB2b("");
    setB2c("");
  };

  const startEdit = (p: Record<string, unknown>) => {
    const id = String(p.id ?? p.wc_id ?? "");
    setEditingId(id);
    setName(String(p.title ?? p.name ?? ""));
    setSku(String(p.sku ?? ""));
    setImageUrl(productImage(p));
    setStock(p.stock_quantity != null ? String(p.stock_quantity) : "");
    setB2b(b2bPrice(p));
    setB2c(b2cPrice(p));
    setFormOpen(true);
  };

  const save = async () => {
    setErr(null);
    try {
      const body = {
        regular_price: b2b ? Number(b2b) : null,
        b2c_price: b2c ? Number(b2c) : null,
        image_url: imageUrl.trim() || null,
        stock_quantity: stock ? Number(stock) : null,
      };
      if (editingId) {
        await editAdminProduct(editingId, body);
      } else {
        if (!name.trim()) {
          setErr("Product name is required.");
          return;
        }
        await createAdminProduct({
          name: name.trim(),
          sku: sku.trim(),
          b2b_price: b2b ? Number(b2b) : null,
          b2c_price: b2c ? Number(b2c) : null,
          image_url: imageUrl.trim(),
          stock_quantity: stock ? Number(stock) : null,
        });
      }
      resetForm();
      await load(q);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save product.");
    }
  };

  const remove = async (p: Record<string, unknown>) => {
    const id = String(p.id ?? p.wc_id ?? "");
    const title = String(p.title ?? p.name ?? id);
    if (!id || !window.confirm(`Delete “${title}”? This removes it from the shop.`)) return;
    setErr(null);
    try {
      await deleteAdminProduct(id);
      setItems((prev) => prev.filter((row) => String(row.id ?? row.wc_id ?? "") !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete product.");
    }
  };

  const priceLabel = channel === "b2b" ? "B2B price" : "B2C price";

  return (
    <section className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-navy">
            {channel === "b2b" ? "B2B products" : "B2C products"}
          </h2>
          <p className="text-sm text-neutral-500">
            {channel === "b2b"
              ? "Wholesale prices shown for approved business accounts."
              : "Public store prices shown for personal shoppers."}
          </p>
        </div>
        <Button
          type="button"
          className="h-10 bg-sam text-white hover:bg-sam-dark"
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add product
        </Button>
      </div>

      <form
        className="mt-4 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-11 bg-[#F4F6FB]" />
        <Button type="submit" className="h-11 bg-brand text-white hover:bg-brand-dark" disabled={busy}>
          {busy ? "…" : "Search"}
        </Button>
      </form>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {formOpen ? (
        <div className="mt-5 rounded-xl border border-brand/20 bg-[#F7F8FC] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-navy">{editingId ? "Edit product" : "Add product"}</p>
            <button type="button" onClick={resetForm} className="rounded-full p-1 text-neutral-500 hover:bg-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input className="mt-1 bg-white" value={name} onChange={(e) => setName(e.target.value)} disabled={Boolean(editingId)} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input className="mt-1 bg-white" value={sku} onChange={(e) => setSku(e.target.value)} disabled={Boolean(editingId)} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input className="mt-1 bg-white" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Image URL</Label>
              <Input className="mt-1 bg-white" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">B2B price</p>
              <Input className="mt-2" value={b2b} onChange={(e) => setB2b(e.target.value)} placeholder="€ wholesale" />
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sam-dark">B2C price</p>
              <Input className="mt-2" value={b2c} onChange={(e) => setB2c(e.target.value)} placeholder="€ public" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" className="bg-brand text-white hover:bg-brand-dark" onClick={() => void save()}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="px-2 py-3">Product</th>
              <th className="px-2 py-3">SKU</th>
              <th className="px-2 py-3">{priceLabel}</th>
              <th className="px-2 py-3">Stock</th>
              <th className="px-2 py-3 text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const id = String(p.id ?? p.wc_id ?? "");
              const title = String(p.title ?? p.name ?? id);
              const img = productImage(p);
              const shown = channel === "b2b" ? money(p.wholesalePrice ?? p.b2b_price ?? p.price) : money(p.retailPrice ?? p.b2c_price);
              return (
                <tr key={id} className="border-b border-black/[0.04]">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EEF1F8] ring-1 ring-black/[0.04]">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="block h-full w-full" />
                        )}
                      </span>
                      <span className="font-medium text-navy">{title}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-neutral-500">{String(p.sku || "—")}</td>
                  <td className="px-2 py-3 font-semibold text-navy">{shown}</td>
                  <td className="px-2 py-3">{p.stock_quantity != null ? String(p.stock_quantity) : p.in_stock ? "In stock" : "—"}</td>
                  <td className="px-2 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-brand hover:bg-brand/10"
                        aria-label="Edit product"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        aria-label="Delete product"
                        onClick={() => void remove(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && !busy ? <p className="px-2 py-8 text-sm text-neutral-500">No products found.</p> : null}
      </div>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={busy}
          onClick={() => void load(q, items.length, true)}
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}
