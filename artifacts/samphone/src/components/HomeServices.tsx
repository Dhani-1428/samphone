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
        <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight text-brand md:text-[2.15rem]">
          {t("home_services_title")}
        </h2>
        <span className="mb-5 mt-2 block h-[4px] w-12 rounded-full bg-sam" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-brand/15 bg-white p-4 shadow-sm transition-colors hover:border-sam hover:bg-brand/[0.04]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sam text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[15px] font-bold text-brand">
                    {t(item.titleKey)}
                    <ArrowRight className="h-4 w-4 shrink-0 text-sam opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#5A6578]">{t(item.subKey)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
