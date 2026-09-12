import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Package, Users } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import AdminWholesale from "@/pages/admin/AdminWholesale";
import AdminProductBoard from "@/pages/admin/AdminProductBoard";
import { useAuth } from "@/contexts/AuthContext";
import { adminBearerToken } from "@/config/samphone";
import { fetchAdminUsers, fetchAdminWholesaleRequests } from "@/lib/samphone-cloud";
import { isB2bAccount } from "@/lib/admin-access";
import { cn } from "@/lib/utils";

type LaneView = "products" | "customers";

export default function AdminLane({ channel }: { channel: "b2b" | "b2c" }) {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const openAdd = params.get("add") === "1";
  const view: LaneView = params.get("view") === "customers" ? "customers" : "products";
  const title = channel === "b2b" ? "B2B" : "B2C";
  const { user } = useAuth();
  const token = adminBearerToken(user?.token);
  const [pending, setPending] = useState(0);

  const setView = (next: LaneView) => {
    const p = new URLSearchParams();
    if (next === "customers") p.set("view", "customers");
    const qs = p.toString();
    setLocation(`/admin/${channel}${qs ? `?${qs}` : ""}`);
  };

  useEffect(() => {
    if (!token || channel !== "b2b") return;
    void (async () => {
      const [reqs, all] = await Promise.all([
        fetchAdminWholesaleRequests(token).catch(() => []),
        fetchAdminUsers(token).catch(() => []),
      ]);
      const seen = new Set<string>();
      let n = 0;
      for (const row of [...reqs, ...all]) {
        const id = row.id || row.email;
        if (seen.has(id)) continue;
        seen.add(id);
        if (isB2bAccount(row) && (row.wholesaleStatus || "").toLowerCase() === "pending") n += 1;
      }
      setPending(n);
    })();
  }, [token, channel]);

  return (
    <AdminShell title={title} pendingCustomers={pending}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Switch between products and customers with the buttons.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-[#EEF1F8] p-1">
          <button
            type="button"
            onClick={() => setView("products")}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold",
              view === "products" ? "bg-white text-navy shadow-sm" : "text-neutral-500 hover:text-navy",
            )}
          >
            <Package className="h-4 w-4" />
            Products
          </button>
          <button
            type="button"
            onClick={() => setView("customers")}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold",
              view === "customers" ? "bg-white text-navy shadow-sm" : "text-neutral-500 hover:text-navy",
            )}
          >
            <Users className="h-4 w-4" />
            Customers
            {channel === "b2b" && pending > 0 ? (
              <span className="rounded-full bg-sam px-1.5 py-0.5 text-[10px] font-bold text-white">{pending}</span>
            ) : null}
          </button>
        </div>
      </div>
      <div className="mt-6">
        {view === "customers" ? (
          <AdminWholesale lane={channel} embedded />
        ) : (
          <AdminProductBoard channel={channel} openAdd={openAdd} />
        )}
      </div>
    </AdminShell>
  );
}
