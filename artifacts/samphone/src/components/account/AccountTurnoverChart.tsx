import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { turnoverByMonth, type ChartRange } from "@/lib/account-store";
import type { StoredOrder } from "@/lib/orders";

const RANGES: ChartRange[] = ["12m", "90d", "30d", "7d"];

type Props = { orders: StoredOrder[] };

export default function AccountTurnoverChart({ orders }: Props) {
  const { t } = useLang();
  const [range, setRange] = useState<ChartRange>("12m");
  const currency = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";

  const data = useMemo(() => turnoverByMonth(orders, range), [orders, range]);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const rangeLabel = (r: ChartRange) => {
    if (r === "12m") return t("account_chart_12m");
    if (r === "90d") return t("account_chart_90d");
    if (r === "30d") return t("account_chart_30d");
    return t("account_chart_7d");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-bold text-foreground">{t("account_turnover_title")}</h2>
        <Button type="button" size="sm" variant="default" className="rounded-full px-5">
          {t("account_analyse")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 border-b border-border mb-4 text-sm">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "pb-2 -mb-px border-b-2 transition-colors",
              range === r
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {rangeLabel(r)}
          </button>
        ))}
      </div>

      <ChartContainer
        config={{ turnover: { label: t("account_stat_turnover"), color: "hsl(var(--primary))" } }}
        className="h-[220px] w-full"
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical className="stroke-border/60" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            domain={[0, maxVal * 1.1]}
            tickFormatter={(v) => `${currency}${v}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-turnover)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
