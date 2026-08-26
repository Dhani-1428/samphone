import { Truck } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function HomeCutoff() {
  const { t } = useLang();

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-[2rem]">{t("cutoff_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cutoff_label")}</p>
            <p className="mt-3 font-display text-4xl font-bold text-foreground">{t("cutoff_time")}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4 text-[#2B5CB8]" />
              {t("cutoff_hint")}
            </p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cutoff_shipping")}</p>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{t("cutoff_shipping_value")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("cutoff_shipping_hint")}</p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cutoff_support")}</p>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{t("phone")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("cutoff_support_hint")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
