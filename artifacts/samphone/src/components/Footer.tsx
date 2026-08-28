import { useState } from "react";
import { Link } from "wouter";
import { Mail, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL_LINKS, STORE_EMAIL, STORE_PHONE } from "@/config/samphone";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const helpLinks = [
    { href: user ? "/account" : "/register", label: t("footer_onboarding") },
    { href: "/account", label: t("footer_account_mgmt") },
    { href: "/track", label: t("footer_orders_payments") },
    { href: "/diagnostics", label: t("nav_diagnostics") },
    { href: "/track", label: t("footer_shipping") },
    { href: "/contact", label: t("footer_warranty") },
  ];

  const serviceLinks = [
    { href: "mailto:hello@samphone.pt", label: t("footer_email_support"), external: true },
    { href: "/contact", label: t("footer_helpdesk") },
    { href: "/book-repair", label: t("nav_book_repair") },
    { href: "/trade-in", label: t("nav_trade_in") },
  ];

  const shopLinks = [
    { href: "/accessories", label: t("nav_accessories") },
    { href: "/smartphones", label: t("nav_smartphones") },
    { href: "/tablets", label: t("nav_tablets") },
    { href: "/group/Hoco", label: t("nav_hoco") },
    { href: "/cards", label: t("nav_cards") },
    { href: "/new", label: t("nav_new") },
    { href: "/multi-brand", label: t("nav_multibrand") },
  ];

  const policyLinks = [
    { href: LEGAL_LINKS.terms, label: t("footer_terms") },
    { href: LEGAL_LINKS.refunds, label: t("footer_refunds") },
    { href: LEGAL_LINKS.shipping, label: t("footer_shipping_policy") },
    { href: LEGAL_LINKS.privacy, label: t("footer_privacy") },
  ];

  return (
    <footer id="footer" className="bg-navy text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <BrandLogo className="mb-5 h-8 w-auto" />
            <h4 className="mb-4 font-display text-lg font-bold">{t("footer_need_help")}</h4>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm font-semibold text-white transition-colors hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-bold">{t("footer_customer_service")}</h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} className="text-sm font-semibold text-white transition-colors hover:underline">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm font-semibold text-white transition-colors hover:underline">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-bold">{lang === "pt" ? "Loja" : "Shop"}</h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-white transition-colors hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-bold">{t("footer_policies")}</h4>
            <ul className="space-y-2.5">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-white transition-colors hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-bold">{lang === "pt" ? "Contacte-nos" : "Contact"}</h4>
            <div className="mb-5 space-y-2 text-sm font-semibold text-white">
              <p>Rua da Palma N.221–223<br />1100-391 Lisboa, Portugal</p>
              <a href={`tel:${STORE_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4" /> {STORE_PHONE}
              </a>
              <a href={`mailto:${STORE_EMAIL}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4" /> {STORE_EMAIL}
              </a>
            </div>
            <p className="mb-2 text-sm font-semibold">{lang === "pt" ? "Newsletter" : "Newsletter"}</p>
            {subscribed ? (
              <p className="text-sm font-semibold text-white">{lang === "pt" ? "Subscrição ativa!" : "You're subscribed!"}</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setSubscribed(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === "pt" ? "O seu email" : "Your email"}
                  className="h-10 min-w-0 flex-1 rounded-md bg-white/10 px-3 text-sm font-semibold text-white placeholder:text-white/70 outline-none ring-1 ring-white/25 focus:ring-white"
                  data-testid="input-newsletter"
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-white px-3 text-sm font-bold text-black hover:bg-neutral-200"
                  data-testid="button-subscribe"
                >
                  OK
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/20 pt-6 text-xs font-semibold text-white md:flex-row">
          <p>© {new Date().getFullYear()} SAMPHONE. Rua da Palma N.221–223, Lisboa.</p>
          <a href={LEGAL_LINKS.livro} className="hover:text-white" target="_blank" rel="noreferrer">
            {t("footer_livro")}
          </a>
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-white/80">
          {t("footer_developed_by")}{" "}
          <a
            href="https://bonusitsolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
          >
            Bonus IT Solutions
          </a>
        </p>
      </div>
    </footer>
  );
}
