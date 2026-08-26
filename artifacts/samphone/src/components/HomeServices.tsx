import { Link } from "wouter";
import { ArrowRight, RefreshCcw, ShieldCheck, Stethoscope, Wrench } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const services = [
  { href: "/book-repair", icon: Wrench, titleKey: "home_service_repair", subKey: "home_service_repair_sub" },
  { href: "/trade-in", icon: RefreshCcw, titleKey: "home_service_trade", subKey: "home_service_trade_sub" },
  { href: "/diagnostics", icon: Stethoscope, titleKey: "home_service_diag", subKey: "home_service_diag_sub" },
  { href: "/track", icon: ShieldCheck, titleKey: "home_service_ship", subKey: "home_service_ship_sub" },
] as const;

export default function HomeServices() {
  const { t } = useLang();

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
          {t("home_services_title")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-muted/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#4A7AD4] to-[#1F4E9E] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[15px] font-bold text-foreground">
                    {t(item.titleKey)}
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t(item.subKey)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
