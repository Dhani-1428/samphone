import { type FormEvent, type MouseEvent, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { notifyStock } from "@/lib/samphone-cloud";
import { cn } from "@/lib/utils";

function alertKey(productId: string) {
  return `samphone-stock-alert:${productId}`;
}

export default function NotifyMeButton({
  productId,
  className,
  size = "card",
}: {
  productId: string;
  className?: string;
  size?: "card" | "page";
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [askEmail, setAskEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(() => {
    try {
      return Boolean(productId && sessionStorage.getItem(alertKey(productId)));
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const id = productId.trim();
  const tall = size === "page";

  const subscribe = async (address: string) => {
    if (!id) return;
    const trimmed = address.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setAskEmail(true);
      setError(t("notify_stock_need_email"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await notifyStock(id, trimmed);
      try {
        sessionStorage.setItem(alertKey(id), "1");
      } catch {
        /* ignore */
      }
      setDone(true);
      setAskEmail(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notify_stock"));
    } finally {
      setBusy(false);
    }
  };

  const onButton = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const known = (email || user?.email || "").trim();
    if (known.includes("@")) {
      void subscribe(known);
      return;
    }
    setAskEmail(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void subscribe(email);
  };

  if (!id) return null;

  if (done) {
    return (
      <p
        className={cn(
          "flex items-center justify-center font-medium text-brand",
          tall ? "h-12 min-w-0 flex-1 gap-1 px-2 text-center text-sm" : "h-9 w-9 shrink-0",
          className,
        )}
        title={t("notify_stock_ok")}
      >
        <Bell className={tall ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2} fill="currentColor" />
        {tall ? <span>{t("notify_stock_ok")}</span> : <span className="sr-only">{t("notify_stock_ok")}</span>}
      </p>
    );
  }

  if (askEmail) {
    return (
      <form
        className={cn("flex min-w-0 flex-col gap-1", tall ? "flex-1" : "relative w-9", className)}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("notify_stock_need_email")}
          className={cn(
            "rounded-none border border-black/[0.16] bg-white px-2 text-xs text-foreground",
            tall ? "h-10 w-full" : "absolute right-0 z-30 h-8 w-40",
          )}
        />
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "product-card-add inline-flex items-center justify-center disabled:opacity-60",
            tall ? "h-11 gap-1 px-2 text-xs uppercase" : "h-9 w-9 shrink-0",
          )}
          aria-label={t("notify_me")}
        >
          <Bell className={tall ? "h-4 w-4" : "h-6 w-6"} strokeWidth={2} />
          {tall ? <span>{busy ? "…" : t("notify_me")}</span> : <span className="sr-only">{busy ? "…" : t("notify_me")}</span>}
        </button>
        {error ? <p className="text-[10px] leading-tight text-destructive">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", tall ? "min-w-0 flex-1" : "shrink-0", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={onButton}
        className={cn(
          "product-card-add inline-flex items-center justify-center disabled:opacity-60",
          tall ? "h-12 w-full gap-1.5 px-2 text-sm uppercase" : "h-9 w-9 shrink-0",
        )}
        aria-label={t("notify_me")}
      >
        <Bell className={tall ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2} />
        {tall ? <span className="truncate">{t("notify_me")}</span> : <span className="sr-only">{t("notify_me")}</span>}
      </button>
      {error ? <p className="text-[10px] leading-tight text-destructive">{error}</p> : null}
    </div>
  );
}
