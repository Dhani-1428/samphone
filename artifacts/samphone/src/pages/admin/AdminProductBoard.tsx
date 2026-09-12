import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeCatalogImageUrl } from "@/config/samphone";
import AdminRecordDialog from "@/components/admin/AdminRecordDialog";
import {
  createAdminProduct,
  deleteAdminProduct,
  editAdminProduct,
  fetchAdminProductList,
  fetchAdminProductRecord,
} from "@/lib/samphone-cloud";

type Channel = "b2b" | "b2c";

function money(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function priceInput(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(2);
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
  return priceInput(p.stored_business_price ?? p.wholesalePrice ?? p.b2b_price ?? p.apiPrice);
}

function b2cPrice(p: Record<string, unknown>): string {
  return priceInput(p.stored_b2c_override ?? p.stored_public_price ?? p.retailPrice ?? p.b2c_price);
}

function fillForm(p: Record<string, unknown>) {
  return {
    name: String(p.title ?? p.name ?? "").trim(),
    sku: String(p.sku ?? "").trim(),
    imageUrl: productImage(p),
    stock: p.stock_quantity != null && p.stock_quantity !== "" ? String(p.stock_quantity) : "",
    b2b: b2bPrice(p),
    b2c: b2cPrice(p),
  };
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
    const filled = fillForm(p);
    setEditingId(id);
    setName(filled.name);
    setSku(filled.sku);
    setImageUrl(filled.imageUrl);
    setStock(filled.stock);
    setB2b(filled.b2b);
    setB2c(filled.b2c);
    setFormOpen(true);
    if (!id) return;
    void (async () => {
      try {
        const full = await fetchAdminProductRecord(id);
        if (!full) return;
        const next = fillForm({ ...p, ...full });
        setName(next.name || filled.name);
        setSku(next.sku || filled.sku);
        setImageUrl(next.imageUrl || filled.imageUrl);
        setStock(next.stock || filled.stock);
        setB2b(filled.b2b || next.b2b);
        setB2c(filled.b2c || next.b2c);
      } catch {
        /* list row already filled */
      }
    })();
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
        <AdminRecordDialog
          title={editingId ? "Edit product" : "Add product"}
          subtitle={editingId ? [sku, editingId].filter(Boolean).join(" · ") : "New catalog item"}
          onClose={resetForm}
          footer={
            <>
              <Button type="button" className="bg-brand text-white hover:bg-brand-dark" onClick={() => void save()}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </>
          }
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-28 w-28 rounded-xl object-cover ring-1 ring-black/[0.06]" />
          ) : null}
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
              <Input className="mt-1 bg-white" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
            </div>
            <div className="sm:col-span-2">
              <Label>Image URL</Label>
              <Input className="mt-1 bg-white" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-[#F7F8FC] p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">B2B price</p>
              <Input className="mt-2 bg-white" value={b2b} onChange={(e) => setB2b(e.target.value)} placeholder="0.00" inputMode="decimal" />
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-[#F7F8FC] p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sam-dark">B2C price</p>
              <Input className="mt-2 bg-white" value={b2c} onChange={(e) => setB2c(e.target.value)} placeholder="0.00" inputMode="decimal" />
            </div>
          </div>
        </AdminRecordDialog>
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
              const shown =
                channel === "b2b"
                  ? money(p.stored_business_price ?? p.wholesalePrice ?? p.b2b_price)
                  : money(p.stored_b2c_override ?? p.stored_public_price ?? p.retailPrice ?? p.b2c_price);
              return (
                <tr
                  key={id}
                  className="cursor-pointer border-b border-black/[0.04] hover:bg-[#F7F8FC]"
                  onClick={() => startEdit(p)}
                >
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
                  <td className="py-3 font-semibold tabular-nums text-navy">{shown}</td>
                  <td className="px-2 py-3 tabular-nums">
                    {p.stock_quantity != null ? String(p.stock_quantity) : p.in_stock ? "In stock" : "—"}
                  </td>
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
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
