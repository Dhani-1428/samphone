import { useState } from "react";
import { Link } from "wouter";
import { Mail, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
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
    { href: "/cards", label: t("nav_cards") },
    { href: "/new", label: t("nav_new") },
    { href: "/multi-brand", label: t("nav_multibrand") },
  ];

  return (
    <footer id="footer" className="bg-navy text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo className="mb-5 h-10 w-auto" />
            <h4 className="mb-4 font-display text-lg font-bold">{t("footer_need_help")}</h4>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
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
                    <a href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
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
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-bold">{lang === "pt" ? "Contacte-nos" : "Contact"}</h4>
            <div className="mb-5 space-y-2 text-sm text-white/70">
              <p>Rua da Palma N.221–223<br />1100-391 Lisboa, Portugal</p>
              <a href="tel:+351937119295" className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4" /> +351 937 119 295
              </a>
              <a href="mailto:hello@samphone.pt" className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4" /> hello@samphone.pt
              </a>
            </div>
            <p className="mb-2 text-sm font-semibold">{lang === "pt" ? "Newsletter" : "Newsletter"}</p>
            {subscribed ? (
              <p className="text-sm text-[#A8B8D6]">{lang === "pt" ? "Subscrição ativa!" : "You're subscribed!"}</p>
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
                  className="h-10 min-w-0 flex-1 rounded-md bg-white/10 px-3 text-sm text-white placeholder:text-white/50 outline-none ring-1 ring-white/15 focus:ring-[#5A73A8]"
                  data-testid="input-newsletter"
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-[#5A73A8] px-3 text-sm font-semibold hover:bg-[#4A6494]"
                  data-testid="button-subscribe"
                >
                  OK
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row">
          <p>© {new Date().getFullYear()} SAMPHONE. Rua da Palma N.221–223, Lisboa.</p>
          <p>Developed by Bonus IT Solutions</p>
        </div>
      </div>
    </footer>
  );
}
