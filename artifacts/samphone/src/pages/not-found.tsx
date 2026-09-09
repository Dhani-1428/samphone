import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center bg-muted/20 px-4 py-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-brand" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t("notfound_title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("notfound_body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            {t("backToHome")}
          </Link>
          <Link
            href="/accessories"
            className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm font-bold hover:bg-muted"
          >
            {t("hero_shop")}
          </Link>
        </div>
      </div>
    </div>
  );
}
