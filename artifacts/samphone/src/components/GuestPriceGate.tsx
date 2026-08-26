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
          <span className="text-xs font-medium leading-tight">{t("login_to_buy")}</span>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full text-xs h-8">
          <Link href={loginHref}>{t("login")}</Link>
        </Button>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">{t("loginForPricing")}</p>
        <Button asChild className="h-11 w-full bg-[#5A73A8] text-white hover:bg-[#4A6494]">
          <Link href={loginHref}>{t("login_to_buy")}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("auth_no_account")}{" "}
          <Link href={`/register?next=${encodeURIComponent(loc)}`} className="font-semibold text-[#5A73A8] hover:underline">
            {t("auth_register_title")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Link
      href={loginHref}
            className={cn("flex h-10 items-center justify-center rounded-md bg-[#5A73A8] text-sm font-semibold text-white hover:bg-[#4A6494]")}
    >
      {t("login_to_buy")}
    </Link>
  );
}
