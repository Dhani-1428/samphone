import { Link, useLocation } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Variant = "card" | "compact" | "hero";

export default function GuestPriceGate({ variant = "card" }: { variant?: Variant }) {
  const { t } = useLang();
  const [loc] = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2 w-full min-w-0">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium leading-tight">{t("loginToSeePrice")}</span>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full text-xs h-8">
          <Link href={loginHref}>{t("login")}</Link>
        </Button>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 max-w-md">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">{t("loginToSeePrice")}</p>
            <p className="text-sm text-muted-foreground">{t("loginForPricing")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={loginHref}>{t("login")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/register?next=${encodeURIComponent(loc)}`}>{t("auth_register_title")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-2",
        "dark:bg-muted/20",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">{t("loginToSeePrice")}</span>
      </div>
      <Button asChild variant="default" size="sm" className="w-full">
        <Link href={loginHref}>{t("login")}</Link>
      </Button>
    </div>
  );
}
