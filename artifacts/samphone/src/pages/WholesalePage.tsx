import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { seesWholesalePrices } from "@/lib/customer-price";
import { STORE_EMAIL, STORE_PHONE } from "@/config/samphone";

export default function WholesalePage() {
  const { t } = useLang();
  const { user } = useAuth();
  const approved = seesWholesalePrices(user);
  const pending = user && (user.accountType || "").toLowerCase() === "b2b" && !approved;

  return (
    <div className="min-h-[70vh] bg-muted/20">
      <div className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[980px] px-5 py-10 sm:px-8">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_kicker")}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{t("b2b_page_title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("b2b_page_intro")}</p>
          {pending ? (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {t("wholesale_pending_banner")}
            </p>
          ) : null}
          {approved ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              {t("b2b_approved_note")}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {!user ? (
              <>
                <Link
                  href="/register/business"
                  className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
                >
                  {t("b2b_open_account")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm font-bold hover:bg-muted"
                >
                  {t("b2b_already_registered")}
                </Link>
              </>
            ) : (
              <Link
                href="/account"
                className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
              >
                {t("auth_my_account")}
              </Link>
            )}
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm font-bold hover:bg-muted"
            >
              {t("nav_contact")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[980px] gap-6 px-5 py-10 sm:px-8 md:grid-cols-2">
        {[
          ["b2b_point_pricing", "b2b_point_pricing_sub"],
          ["b2b_point_account", "b2b_point_account_sub"],
          ["b2b_point_parts", "b2b_point_parts_sub"],
          ["b2b_point_docs", "b2b_point_docs_sub"],
        ].map(([title, sub]) => (
          <article key={title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">{t(title as "b2b_point_pricing")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(sub as "b2b_point_pricing_sub")}</p>
          </article>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[980px] px-5 pb-12 sm:px-8">
        <h2 className="font-display text-xl font-bold">{t("b2b_shop_title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("b2b_shop_sub")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/smartphones" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("footer_shop_smartphones")}
          </Link>
          <Link href="/accessories" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("footer_shop_accessories")}
          </Link>
          <Link href="/tools" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("b2b_shop_tools")}
          </Link>
          <Link href="/book-repair" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("nav_book_repair")}
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          {STORE_EMAIL} · {STORE_PHONE}
        </p>
      </div>
    </div>
  );
}
