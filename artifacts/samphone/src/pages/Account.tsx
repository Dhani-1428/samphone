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
import { listOrders, type StoredOrder } from "@/lib/orders";
import {
  cancelCloudOrder,
  deleteCloudAccount,
  exportCloudAccount,
  fetchCloudOrders,
  patchCloudProfile,
} from "@/lib/samphone-cloud";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { t, lang } = useLang();
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
    setAccountData(loadAccountData(user.email));
    setOrders(listOrders());
    void fetchCloudOrders()
      .then((rows) => {
        setOrders(
          rows.map((o) => ({
            id: o.id,
            createdAt: o.createdAt,
            status: (o.status as StoredOrder["status"]) || "processing",
            lines: o.lines.map((l, i) => ({ cartKey: `api:${o.id}:${i}`, name: l.name, qty: l.qty })),
            stepIndex: 0,
            totalEur: o.totalEur,
          })),
        );
      })
      .catch(() => {
        /* keep local fallback */
      });
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
    if (!accountData || !user) return;
    persist(accountData);
    void patchCloudProfile({
      name: user.name,
      phone: accountData.address.phone,
      address: accountData.address.street,
      city: accountData.address.city,
      postal_code: accountData.address.zip,
      vat_number: accountData.vatNumber,
      business_name: accountData.address.company,
      language: lang,
    }).catch(() => {
      /* local save still applied */
    });
    toast({ title: t("account_save_changes") });
  };

  const handleLogout = () => {
    clearCart();
    logout();
    setLocation("/");
  };

  const refreshOrders = () => {
    void fetchCloudOrders()
      .then((rows) => {
        setOrders(
          rows.map((o) => ({
            id: o.id,
            createdAt: o.createdAt,
            status: (o.status as StoredOrder["status"]) || "processing",
            lines: o.lines.map((l, i) => ({ cartKey: `api:${o.id}:${i}`, name: l.name, qty: l.qty })),
            stepIndex: 0,
            totalEur: o.totalEur,
          })),
        );
      })
      .catch(() => setOrders(listOrders()));
  };

  const placeFromCart = () => {
    setLocation("/cart");
  };

  const handleExport = async () => {
    try {
      const data = await exportCloudAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "samphone-account-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t("gdpr_export") });
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t("gdpr_delete_confirm"))) return;
    try {
      await deleteCloudAccount();
      clearCart();
      logout();
      setLocation("/");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t("gdpr_delete") });
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      await cancelCloudOrder(id);
      refreshOrders();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t("order_cancel") });
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
                onExport={handleExport}
                onDeleteAccount={handleDeleteAccount}
                onCancelOrder={handleCancelOrder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
