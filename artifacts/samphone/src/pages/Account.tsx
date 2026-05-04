import { useState, useEffect } from "react";
import { Link } from "wouter";
import { LayoutDashboard, LogOut, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { createOrderFromCart, listOrders, ensureDemoOrder, type StoredOrder } from "@/lib/orders";

export default function Account() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const { clearCart, items } = useCart();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    ensureDemoOrder();
    setOrders(listOrders());
  }, []);

  const refreshOrders = () => setOrders(listOrders());

  const placeFromCart = () => {
    const o = createOrderFromCart(items);
    if (o) {
      clearCart();
      refreshOrders();
    }
  };

  const handleLogout = () => {
    clearCart();
    logout();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <p className="text-muted-foreground mb-6">{t("loginForPricing")}</p>
        <Button asChild>
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("account_title")}</span>
        </nav>

        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          <aside className="rounded-xl border border-border bg-card p-4 h-fit shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display font-bold text-lg">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <ul className="space-y-1">
              <li>
                <span className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  {t("account_dashboard")}
                </span>
              </li>
            </ul>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 mt-6 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t("auth_logout")}
            </Button>
          </aside>

          <main className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              {t("account_dashboard")}
            </h1>
            <p className="text-muted-foreground mb-6">{t("account_welcome")}</p>
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-foreground/90 mb-8">
              {t("account_profile_hint")}
            </div>

            <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {t("account_orders")}
            </h2>
            <div className="space-y-3 mb-6">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("account_no_orders")}</p>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
                  >
                    <span className="font-mono font-semibold">{o.id}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/track?q=${encodeURIComponent(o.id)}`}>{t("account_track_link")}</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
            <Button type="button" variant="secondary" className="mb-2" onClick={placeFromCart} disabled={Object.keys(items).length === 0}>
              {t("account_create_order")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("account_order_created")} SP-LIS-…</p>
          </main>
        </div>
      </div>
    </div>
  );
}
