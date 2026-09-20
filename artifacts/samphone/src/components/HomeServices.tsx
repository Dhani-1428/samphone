import { Link } from "wouter";
import { ArrowRight, Wrench } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function HomeServices() {
  const { t } = useLang();

  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <Link
          href="/book-repair"
          className="group relative flex flex-col items-stretch overflow-hidden rounded-2xl bg-brand px-6 py-7 text-white shadow-[0_12px_32px_rgba(36,63,159,0.28)] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-10 sm:py-9"
        >
          <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sam/25" />
          <span className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-white/10" />
          <span className="relative flex min-w-0 items-start gap-4 sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sam text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:h-16 sm:w-16">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                {t("home_service_repair")}
              </span>
              <span className="mt-1.5 block max-w-xl text-sm font-semibold text-white/85 sm:text-base">
                {t("home_service_repair_sub")}
              </span>
            </span>
          </span>
          <span className="relative mt-5 inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-sam px-6 py-3.5 text-base font-extrabold text-white shadow-sm transition group-hover:bg-sam-dark sm:mt-0 sm:self-center sm:px-8 sm:py-4 sm:text-lg">
            {t("nav_book_repair")}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
