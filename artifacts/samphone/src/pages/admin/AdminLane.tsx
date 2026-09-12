import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import AdminShell from "@/components/admin/AdminShell";
import AdminWholesale from "@/pages/admin/AdminWholesale";
import AdminProductBoard from "@/pages/admin/AdminProductBoard";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredApiJwt } from "@/config/samphone";
import { fetchAdminUsers, fetchAdminWholesaleRequests } from "@/lib/samphone-cloud";
import { isB2bAccount } from "@/lib/admin-access";

export default function AdminLane({ channel }: { channel: "b2b" | "b2c" }) {
  const search = useSearch();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const openAdd = params.get("add") === "1";
  const viewParam = params.get("view");
  const title = channel === "b2b" ? "B2B" : "B2C";
  const { user } = useAuth();
  const token = getStoredApiJwt() ?? user?.token ?? "";
  const [pending, setPending] = useState(0);
  const [view, setView] = useState<"accounts" | "products">(
    openAdd || viewParam === "products" ? "products" : "accounts",
  );

  useEffect(() => {
    if (openAdd || viewParam === "products") setView("products");
  }, [openAdd, viewParam]);

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
            {channel === "b2b"
              ? "Business accounts from Clerk and approved dealers on samphone.pt."
              : "Personal shopper accounts from Clerk."}
          </p>
        </div>
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-black/[0.08]">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              view === "accounts" ? "bg-brand text-white" : "text-navy hover:bg-[#F4F6FB]"
            }`}
            onClick={() => setView("accounts")}
          >
            Accounts
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              view === "products" ? "bg-brand text-white" : "text-navy hover:bg-[#F4F6FB]"
            }`}
            onClick={() => setView("products")}
          >
            Products
          </button>
        </div>
      </div>
      <div className="mt-6">
        {view === "products" ? (
          <AdminProductBoard channel={channel} openAdd={openAdd} />
        ) : (
          <AdminWholesale lane={channel} embedded />
        )}
      </div>
    </AdminShell>
  );
}
