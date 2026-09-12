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
  const title = channel === "b2b" ? "B2B" : "B2C";
  const { user } = useAuth();
  const token = getStoredApiJwt() ?? user?.token ?? "";
  const [pending, setPending] = useState(0);

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
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {channel === "b2b"
            ? "Products with B2B cost, then business accounts."
            : "Products with B2C public prices, then personal Clerk accounts."}
        </p>
      </div>
      <div className="mt-6 space-y-10">
        <AdminProductBoard channel={channel} openAdd={openAdd} />
        <AdminWholesale lane={channel} embedded />
      </div>
    </AdminShell>
  );
}
