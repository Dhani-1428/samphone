import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeB2BBanner() {
  const { t } = useLang();
  const { user } = useAuth();

  return (
    <section className="bg-[#F4F6FA] py-10 dark:bg-[#12192A]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">{t("b2b_kicker")}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground md:text-3xl">{t("b2b_home_title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("b2b_home_sub")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link
              href="/account"
              className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {t("auth_my_account")}
            </Link>
          ) : (
            <Link
              href="/register/business"
              className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {t("b2b_open_account")}
            </Link>
          )}
          <Link
            href="/b2b"
            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-bold text-foreground hover:bg-muted"
          >
            {t("b2b_learn_more")}
          </Link>
          {!user ? (
            <Link
              href="/login"
              className="inline-flex h-11 items-center px-2 text-sm font-semibold text-brand hover:underline"
            >
              {t("b2b_already_registered")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
