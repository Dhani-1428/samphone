import { Link } from "wouter";
import { ChevronRight, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import AccountAddressForm from "@/components/account/AccountAddressForm";
import AccountTurnoverChart from "@/components/account/AccountTurnoverChart";
import type { AccountData } from "@/lib/account-store";
import { computeOrderStats, profileCompletionPercent } from "@/lib/account-store";
import type { StoredOrder } from "@/lib/orders";

type Props = {
  data: AccountData;
  orders: StoredOrder[];
  onAddressChange: (address: AccountData["address"]) => void;
  onSaveAddress: () => void;
};

export default function AccountDashboard({ data, orders, onAddressChange, onSaveAddress }: Props) {
  const { t } = useLang();
  const currency = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";
  const completion = profileCompletionPercent(data);
  const stats = computeOrderStats(orders);

  const formatMoney = (n: number) =>
    `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency}`;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <p className="font-display text-xl font-bold text-foreground mb-1">
          {t("account_profile_complete", { percent: String(completion) })}
        </p>
        <p className="text-sm text-muted-foreground mb-4">{t("account_profile_complete_sub")}</p>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>

        <p className="text-sm font-medium text-primary mb-4">{t("account_address_prompt")}</p>
        <AccountAddressForm address={data.address} onChange={onAddressChange} />
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onSaveAddress}>
            {t("account_save_address")}
          </Button>
        </div>
      </section>

      <AccountTurnoverChart orders={orders} />

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-display text-lg font-bold text-foreground">{t("account_statistics")}</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-2 py-0.5">
            {t("account_statistics_period")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="py-4 sm:py-2 sm:px-4 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums">{formatMoney(stats.turnover)}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("account_stat_turnover")}</p>
          </div>
          <div className="py-4 sm:py-2 sm:px-4 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums">{stats.orderCount}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("account_stat_orders")}</p>
          </div>
          <div className="py-4 sm:py-2 sm:px-4 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums">{stats.qtyPurchased}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("account_stat_qty")}</p>
          </div>
        </div>
      </section>

      <Link
        href="/contact"
        className="flex items-center gap-4 rounded-xl border border-border bg-sky-50/80 dark:bg-sky-950/20 p-4 md:p-5 hover:border-primary/40 transition-colors group"
      >
        <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
          <Headphones className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {t("account_support_title")}
          </p>
          <p className="text-sm text-muted-foreground">{t("account_support_sub")}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </Link>
    </div>
  );
}

