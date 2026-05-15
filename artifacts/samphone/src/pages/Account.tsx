import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountDashboard from "@/components/account/AccountDashboard";
import AccountSectionPanels from "@/components/account/AccountSectionPanels";
import { parseAccountSection, type AccountSectionId } from "@/components/account/account-sections";
import {
  loadAccountData,
  saveAccountData,
  type AccountData,
} from "@/lib/account-store";
import { createOrderFromCart, ensureDemoOrder, listOrders, type StoredOrder } from "@/lib/orders";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const { items, clearCart } = useCart();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const section = useMemo(
    () => parseAccountSection(new URLSearchParams(search).get("section")),
    [search],
  );

  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    if (!user) return;
    ensureDemoOrder();
    setAccountData(loadAccountData(user.email));
    setOrders(listOrders());
  }, [user]);

  const navigateSection = useCallback(
    (id: AccountSectionId) => {
      setLocation(id === "dashboard" ? "/account" : `/account?section=${id}`);
    },
    [setLocation],
  );

  const persist = useCallback(
    (next: AccountData) => {
      if (!user) return;
      setAccountData(next);
      saveAccountData(user.email, next);
    },
    [user],
  );

  const handleSave = () => {
    if (accountData) persist(accountData);
    toast({ title: t("account_save_changes") });
  };

  const handleLogout = () => {
    clearCart();
    logout();
    setLocation("/");
  };

  const refreshOrders = () => setOrders(listOrders());

  const placeFromCart = () => {
    const o = createOrderFromCart(items);
    if (o) {
      clearCart();
      refreshOrders();
      toast({ title: t("account_order_created"), description: o.id });
    }
  };

  const cartItemCount = Object.values(items).filter((q) => q > 0).length;

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

  if (!accountData) {
    return (
      <div className="bg-muted/30 min-h-[75vh] py-10">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl animate-pulse h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-[75vh] py-8 md:py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("account_title")}</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
          {t("account_title")}
        </h1>

        <div className="grid lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 lg:gap-8 items-start">
          <AccountSidebar
            user={user}
            section={section}
            onNavigate={navigateSection}
            onLogout={handleLogout}
          />

          <div className="min-w-0">
            {section === "dashboard" ? (
              <AccountDashboard
                data={accountData}
                orders={orders}
                onAddressChange={(address) => persist({ ...accountData, address })}
                onSaveAddress={handleSave}
              />
            ) : (
              <AccountSectionPanels
                section={section}
                data={accountData}
                orders={orders}
                cartItemCount={cartItemCount}
                onDataChange={persist}
                onSave={handleSave}
                onPlaceOrder={placeFromCart}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
