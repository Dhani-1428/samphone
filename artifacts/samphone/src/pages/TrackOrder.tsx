import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Loader2, PackageSearch } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderById, type OrderStatus, type StoredOrder } from "@/lib/orders";
import { fetchCloudOrderLookup, type CloudOrder } from "@/lib/samphone-cloud";
import { getStoredApiJwt } from "@/config/samphone";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "track_step_ordered",
  "track_step_packed",
  "track_step_shipped",
  "track_step_delivery",
  "track_step_done",
] as const;

function stepFromStatus(status: string): number {
  const s = status.toLowerCase();
  if (/cancel/.test(s)) return 0;
  if (/deliver/.test(s)) return 4;
  if (/out.?for|distribution|courier/.test(s)) return 3;
  if (/ship/.test(s)) return 2;
  if (/pack/.test(s)) return 1;
  if (/process|paid|pending|confirm/.test(s)) return 1;
  return 0;
}

function resolveStep(o: StoredOrder): number {
  if (typeof o.stepIndex === "number") return Math.min(Math.max(o.stepIndex, 0), 4);
  return stepFromStatus(o.status);
}

function fromCloud(o: CloudOrder): StoredOrder {
  return {
    id: o.id,
    createdAt: o.createdAt,
    status: (o.status as OrderStatus) || "processing",
    lines: o.lines.map((l, i) => ({ cartKey: `api:${o.id}:${i}`, name: l.name, qty: l.qty })),
    stepIndex: stepFromStatus(o.status),
    totalEur: o.totalEur,
  };
}

export default function TrackOrder() {
  const { t } = useLang();
  const search = useSearch();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(getStoredApiJwt());

  const lookup = async (raw?: string) => {
    const id = (raw ?? query).trim();
    setTried(true);
    if (!id) {
      setOrder(null);
      return;
    }
    setBusy(true);
    try {
      const cloud = await fetchCloudOrderLookup(id);
      setOrder(cloud ? fromCloud(cloud) : getOrderById(id));
    } catch {
      setOrder(getOrderById(id));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(search).get("q");
    if (q) {
      setQuery(q);
      void lookup(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stepIdx = order ? resolveStep(order) : -1;

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("nav_track")}</span>
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <PackageSearch className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("track_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">{t("track_sub")}</p>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("track_placeholder")}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && void lookup()}
            />
            <Button type="button" onClick={() => void lookup()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("track_button")}
            </Button>
          </div>

          {!signedIn && (
            <p className="text-xs text-muted-foreground mb-6">
              {t("track_login_hint")}{" "}
              <Link href="/login?next=/track" className="text-primary underline">
                {t("login")}
              </Link>
            </p>
          )}

          {tried && !order && !busy && <p className="text-sm text-destructive mb-6">{t("track_not_found")}</p>}

          {order && (
            <div className="space-y-6">
              <p className="text-sm">
                <span className="text-muted-foreground">{t("track_order_label")}: </span>
                <span className="font-mono font-semibold">{order.id}</span>
              </p>

              <ol className="relative border-l border-border pl-6 space-y-4">
                {STEP_LABELS.map((labelKey, i) => (
                  <li
                    key={labelKey}
                    className={cn("text-sm", i <= stepIdx ? "text-foreground font-medium" : "text-muted-foreground")}
                  >
                    <span
                      className={cn(
                        "absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border-2 bg-background",
                        i <= stepIdx ? "border-primary bg-primary" : "border-muted",
                      )}
                    />
                    {t(labelKey)}
                  </li>
                ))}
              </ol>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium mb-2">{t("track_items")}</p>
                <ul className="space-y-1">
                  {order.lines.map((l) => (
                    <li key={l.cartKey}>
                      {l.name} × {l.qty}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
