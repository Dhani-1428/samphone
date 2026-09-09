import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import {
  COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent as Consent,
} from "@/lib/cookie-consent";
import { LEGAL_LINKS } from "@/config/samphone";

export default function CookieConsent() {
  const { t } = useLang();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [openPrefs, setOpenPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: false, analytics: false, marketing: false });

  useEffect(() => {
    const current = readCookieConsent();
    setConsent(current);
    if (current) {
      setPrefs({
        preferences: current.preferences,
        analytics: current.analytics,
        marketing: current.marketing,
      });
    }
    setReady(true);
    const reopen = () => {
      const latest = readCookieConsent();
      if (latest) {
        setPrefs({
          preferences: latest.preferences,
          analytics: latest.analytics,
          marketing: latest.marketing,
        });
      }
      setOpenPrefs(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!ready) return null;

  const save = (next: { preferences: boolean; analytics: boolean; marketing: boolean }) => {
    const stored = writeCookieConsent(next);
    setConsent(stored);
    setPrefs(next);
    setOpenPrefs(false);
  };

  const showBanner = !consent && !openPrefs;

  return (
    <>
      {showBanner ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-black/10 bg-[#16233F] px-4 py-4 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:px-6"
          role="dialog"
          aria-label={t("cookie_banner_title")}
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold">{t("cookie_banner_title")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/80">
                {t("cookie_banner_body")}{" "}
                <Link href={LEGAL_LINKS.cookies} className="underline decoration-white/40 underline-offset-2 hover:decoration-white">
                  {t("footer_cookies")}
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-md bg-white px-4 text-sm font-bold text-[#16233F] hover:bg-white/90"
                onClick={() => save({ preferences: true, analytics: true, marketing: true })}
              >
                {t("cookie_accept_all")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-white/30 px-4 text-sm font-bold text-white hover:bg-white/10"
                onClick={() => save({ preferences: false, analytics: false, marketing: false })}
              >
                {t("cookie_reject_optional")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md px-4 text-sm font-semibold text-white/90 underline-offset-2 hover:underline"
                onClick={() => setOpenPrefs(true)}
              >
                {t("cookie_manage")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openPrefs ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="w-full max-w-lg rounded-xl bg-background p-5 text-foreground shadow-xl"
          >
            <h2 id="cookie-prefs-title" className="font-display text-xl font-bold">
              {t("cookie_prefs_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("cookie_prefs_body")}</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="rounded-lg border border-border p-3">
                <p className="font-semibold">{t("cookie_cat_necessary")}</p>
                <p className="mt-1 text-muted-foreground">{t("cookie_cat_necessary_sub")}</p>
              </li>
              {(
                [
                  ["preferences", t("cookie_cat_prefs"), t("cookie_cat_prefs_sub")],
                  ["analytics", t("cookie_cat_analytics"), t("cookie_cat_analytics_sub")],
                  ["marketing", t("cookie_cat_marketing"), t("cookie_cat_marketing_sub")],
                ] as const
              ).map(([key, label, sub]) => (
                <li key={key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <span>
                    <span className="font-semibold">{label}</span>
                    <span className="mt-1 block text-muted-foreground">{sub}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                    aria-label={label}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setOpenPrefs(false)}
              >
                {t("cookie_close")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
                onClick={() => save(prefs)}
              >
                {t("cookie_save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
