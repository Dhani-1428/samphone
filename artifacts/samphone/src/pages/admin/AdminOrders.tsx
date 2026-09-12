import { useEffect, useState } from "react";
import { fetchAdminOrders } from "@/lib/samphone-cloud";
import AdminShell from "@/components/admin/AdminShell";

function money(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function when(row: Record<string, unknown>) {
  const raw = String(row.created_at || row.createdAt || row.date_created || "");
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrders() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchAdminOrders(150);
        setItems(data.items);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load orders.");
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const pending = items.filter((o) => {
    const s = String(o.status || "").toLowerCase();
    return s.includes("process") || s.includes("pending") || s === "on-hold";
  }).length;

  return (
    <AdminShell title="Orders" pendingOrders={pending}>
      <h1 className="font-display text-2xl font-bold text-navy">Orders</h1>
      <p className="mt-1 text-sm text-neutral-500">Newest first — website and app orders together.</p>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      {busy ? <p className="mt-6 text-sm text-neutral-500">Loading orders…</p> : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[0.05] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o, i) => {
              const id = String(o.id || o.number || i);
              const email = String(o.email || o.customer_email || o.billing_email || "—");
              const name = String(o.customer_name || o.name || email);
              return (
                <tr key={id} className="border-b border-black/[0.04]">
                  <td className="px-4 py-3 font-semibold text-navy">#{id}</td>
                  <td className="px-4 py-3">
                    <div>{name}</div>
                    <div className="text-xs text-neutral-500">{email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{when(o)}</td>
                  <td className="px-4 py-3 capitalize">{String(o.status || "—")}</td>
                  <td className="px-4 py-3">{money(o.total ?? o.subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!busy && items.length === 0 ? <p className="px-4 py-8 text-sm text-neutral-500">No orders yet.</p> : null}
      </div>
    </AdminShell>
  );
}
