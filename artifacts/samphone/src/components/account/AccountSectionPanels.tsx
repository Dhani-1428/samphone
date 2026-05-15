import { Link } from "wouter";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/contexts/LanguageContext";
import AccountAddressForm from "@/components/account/AccountAddressForm";
import type { AccountSectionId } from "@/components/account/account-sections";
import type { AccountData } from "@/lib/account-store";
import type { StoredOrder } from "@/lib/orders";

type Props = {
  section: AccountSectionId;
  data: AccountData;
  orders: StoredOrder[];
  cartItemCount: number;
  onDataChange: (next: AccountData) => void;
  onSave: () => void;
  onPlaceOrder: () => void;
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">{title}</h1>
      {children}
    </section>
  );
}

export default function AccountSectionPanels({
  section,
  data,
  orders,
  cartItemCount,
  onDataChange,
  onSave,
  onPlaceOrder,
}: Props) {
  const { t } = useLang();
  const currency = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";

  if (section === "information") {
    return (
      <Panel title={t("account_nav_information")}>
        <AccountAddressForm
          address={data.address}
          onChange={(address) => onDataChange({ ...data, address })}
          showCompany
          showDeliveryCheckbox
        />
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onSave}>
            {t("account_save_address")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (section === "2fa") {
    return (
      <Panel title={t("account_nav_2fa")}>
        <p className="text-sm text-muted-foreground mb-6">{t("account_2fa_desc")}</p>
        <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer">
          <Checkbox
            checked={data.twoFactorEnabled}
            onCheckedChange={(v) => onDataChange({ ...data, twoFactorEnabled: v === true })}
          />
          <span className="text-sm font-medium">{t("account_2fa_enable")}</span>
        </label>
        <Button type="button" className="mt-6" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "vat") {
    return (
      <Panel title={t("account_nav_vat")}>
        <p className="text-sm text-muted-foreground mb-4">{t("account_vat_desc")}</p>
        <div className="space-y-2 max-w-md">
          <Label htmlFor="vat">{t("account_vat_number")}</Label>
          <Input
            id="vat"
            value={data.vatNumber}
            onChange={(e) => onDataChange({ ...data, vatNumber: e.target.value })}
            placeholder="PT123456789"
          />
        </div>
        <Button type="button" className="mt-6" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "notifications") {
    const setNotif = (key: keyof AccountData["notifications"], v: boolean) =>
      onDataChange({ ...data, notifications: { ...data.notifications, [key]: v } });
    return (
      <Panel title={t("account_nav_notifications")}>
        <div className="space-y-3 max-w-lg">
          {(
            [
              ["orders", t("account_notif_orders")],
              ["promotions", t("account_notif_promos")],
              ["restock", t("account_notif_restock")],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer"
            >
              <Checkbox
                checked={data.notifications[key]}
                onCheckedChange={(v) => setNotif(key, v === true)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <Button type="button" className="mt-6" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "payment") {
    return (
      <Panel title={t("account_nav_payment")}>
        {data.paymentMethods.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">{t("account_payment_empty")}</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {data.paymentMethods.map((pm) => (
              <li key={pm.id} className="rounded-lg border border-border px-4 py-3 text-sm flex justify-between">
                <span>{pm.label}</span>
                {pm.last4 ? <span className="text-muted-foreground">•••• {pm.last4}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onDataChange({
              ...data,
              paymentMethods: [
                ...data.paymentMethods,
                { id: `pm-${Date.now()}`, label: "Business card", last4: "4242" },
              ],
            })
          }
        >
          {t("account_payment_add")}
        </Button>
        <Button type="button" className="mt-4 ml-2" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "orders") {
    return (
      <Panel title={t("account_nav_orders")}>
        <div className="space-y-3 mb-6">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("account_no_orders")}</p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-mono font-semibold">{o.id}</span>
                  {o.totalEur != null ? (
                    <span className="ml-3 text-muted-foreground tabular-nums">
                      {o.totalEur.toFixed(2)}
                      {currency}
                    </span>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/track?q=${encodeURIComponent(o.id)}`}>{t("account_track_link")}</Link>
                </Button>
              </div>
            ))
          )}
        </div>
        <Button type="button" variant="secondary" onClick={onPlaceOrder} disabled={cartItemCount === 0}>
          <Package className="w-4 h-4 mr-2" />
          {t("account_create_order")}
        </Button>
      </Panel>
    );
  }

  if (section === "invoices") {
    return (
      <Panel title={t("account_nav_invoices")}>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("account_invoices_empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono">{o.id}</span>
                <span className="text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm" type="button">
                  {t("account_download_invoice")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (section === "payments-pending") {
    return (
      <Panel title={t("account_nav_payments_pending")}>
        <p className="text-sm text-muted-foreground">{t("account_payments_pending_empty")}</p>
      </Panel>
    );
  }

  if (section === "ocadia") {
    return (
      <Panel title={t("account_nav_ocadia")}>
        <p className="text-sm text-muted-foreground mb-4">{t("account_ocadia_desc")}</p>
        <Button type="button" variant="outline" asChild>
          <Link href="/contact">{t("account_ocadia_contact")}</Link>
        </Button>
      </Panel>
    );
  }

  if (section === "restock") {
    return (
      <Panel title={t("account_nav_restock")}>
        {data.restockAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">{t("account_restock_empty")}</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {data.restockAlerts.map((a, i) => (
              <li key={i} className="rounded-lg border border-border px-4 py-2 text-sm">
                {a}
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onDataChange({
              ...data,
              restockAlerts: [...data.restockAlerts, `SKU alert ${data.restockAlerts.length + 1}`],
            })
          }
        >
          {t("account_restock_add")}
        </Button>
        <Button type="button" className="mt-4 ml-2" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "warranty") {
    return (
      <Panel title={t("account_nav_warranty")}>
        {data.warrantyReturns.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">{t("account_warranty_empty")}</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {data.warrantyReturns.map((w) => (
              <li key={w.id} className="rounded-lg border border-border px-4 py-3 text-sm flex justify-between gap-2">
                <span>{w.productName}</span>
                <span className="text-muted-foreground capitalize">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onDataChange({
              ...data,
              warrantyReturns: [
                ...data.warrantyReturns,
                {
                  id: `WR-${Date.now().toString(36).toUpperCase()}`,
                  status: "pending",
                  createdAt: new Date().toISOString(),
                  productName: "Warranty request",
                },
              ],
            })
          }
        >
          {t("account_warranty_request")}
        </Button>
        <Button type="button" className="mt-4 ml-2" onClick={onSave}>
          {t("account_save_changes")}
        </Button>
      </Panel>
    );
  }

  if (section === "credit-notes") {
    return (
      <Panel title={t("account_nav_credit_notes")}>
        {data.creditNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("account_credit_empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">{t("account_credit_id")}</th>
                <th className="py-2">{t("account_credit_date")}</th>
                <th className="py-2 text-right">{t("account_credit_amount")}</th>
              </tr>
            </thead>
            <tbody>
              {data.creditNotes.map((n) => (
                <tr key={n.id} className="border-b border-border/60">
                  <td className="py-3 font-mono">{n.id}</td>
                  <td className="py-3">{new Date(n.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right tabular-nums">
                    {n.amount.toFixed(2)}
                    {currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    );
  }

  if (section === "ewallet") {
    return (
      <Panel title={t("account_nav_ewallet")}>
        <p className="text-3xl font-bold tabular-nums mb-2">
          {data.walletBalance.toFixed(2)}
          {currency}
        </p>
        <p className="text-sm text-muted-foreground mb-6">{t("account_ewallet_balance")}</p>
        <Button type="button" variant="outline" asChild>
          <Link href="/contact">{t("account_ewallet_topup")}</Link>
        </Button>
      </Panel>
    );
  }

  return null;
}
