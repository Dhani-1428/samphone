import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  UserRound,
  ShoppingCart,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const WORKSPACE = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/b2b", label: "B2B", Icon: Building2 },
  { href: "/admin/b2c", label: "B2C", Icon: UserRound },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingCart },
];

function navActive(path: string, href: string, exact?: boolean) {
  if (exact) return path === href || path === "/admin/";
  return path === href || path.startsWith(`${href}/`);
}

export default function AdminShell({
  children,
  title,
  pendingCustomers = 0,
  pendingOrders = 0,
}: {
  children: ReactNode;
  title: string;
  pendingCustomers?: number;
  pendingOrders?: number;
}) {
  const [path, setLocation] = useLocation();
  const { user } = useAuth();
  const initials = (user?.name || user?.email || "SP")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-[calc(100dvh-var(--site-header-h,9rem))] bg-[#F4F6FB]">
      <aside className="hidden w-[15.5rem] shrink-0 flex-col bg-brand-dark text-white md:flex">
        <div className="px-4 pb-2 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Workspace</p>
          <p className="mt-3 text-sm font-semibold text-white">Samphone Europe</p>
          <p className="text-xs text-white/55">Wholesale workspace</p>
        </div>
        <nav className="mt-4 flex-1 space-y-6 px-3 pb-6">
          <div>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Workspace</p>
            <div className="space-y-0.5">
              {WORKSPACE.map((item) => {
                const on = navActive(path, item.href, item.exact);
                const badge =
                  item.href === "/admin/b2b"
                    ? pendingCustomers
                    : item.href === "/admin/orders"
                      ? pendingOrders
                      : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                      on ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <item.Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 ? (
                      <span className="min-w-5 rounded-full bg-sam px-1.5 text-center text-[10px] font-bold text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-4 py-3 sm:px-6">
          <p className="text-sm text-neutral-500">
            Admin <span className="text-neutral-300">›</span> <span className="font-medium text-navy">{title}</span>
          </p>
          <div className="flex items-center gap-2">
            <label className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Search anything…"
                className="h-9 w-56 rounded-full border border-black/[0.08] bg-[#F4F6FB] pl-9 pr-3 text-sm outline-none focus:border-brand"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) setLocation(`/admin/b2b?q=${encodeURIComponent(q)}`);
                }}
              />
            </label>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {initials}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:hidden">
            <div className="flex flex-wrap gap-1.5">
              {WORKSPACE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    navActive(path, item.href, "exact" in item ? Boolean(item.exact) : false)
                      ? "bg-brand text-white"
                      : "bg-white text-navy ring-1 ring-black/[0.06]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
