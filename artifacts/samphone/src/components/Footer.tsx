import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  Headset,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Tablet,
  Truck,
  User,
  UserPlus,
  Wrench,
} from "lucide-react";
import { FaCcAmex, FaCcApplePay, FaCcMastercard, FaCcPaypal, FaCcVisa } from "react-icons/fa";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  LEGAL_LINKS,
  STORE_ADDRESS,
  STORE_EMAIL,
  STORE_PHONE,
  STORE_SOCIAL,
} from "@/config/samphone";
import BrandLogo from "@/components/BrandLogo";
import { whatsappChatHref } from "@/lib/whatsapp";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="typo-footer-heading text-white">{children}</h4>
      <span className="mt-1.5 block h-[3px] w-10 rounded-full bg-sam" />
    </div>
  );
}

function FooterLink({
  href,
  label,
  Icon,
  external,
  compact,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  external?: boolean;
  compact?: boolean;
}) {
  const className = compact
    ? "group flex items-center gap-2.5 py-[7px] typo-policy-link text-white/85 transition-colors hover:text-sam"
    : "group flex items-center gap-2.5 py-[7px] typo-footer-link text-white/85 transition-colors hover:text-sam";
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-sam" strokeWidth={1.9} />
      <span className="min-w-0 flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-sam" />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function TrustRow({ Icon, title, sub }: { Icon: LucideIcon; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-sam" strokeWidth={1.8} />
      <span>
        <span className="block text-[13.5px] font-bold leading-tight text-white">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-white/65">{sub}</span>
      </span>
    </li>
  );
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-sam text-white transition-colors hover:bg-sam-dark"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const serviceLinks = [
    { href: `mailto:${STORE_EMAIL}`, label: t("footer_email_support"), Icon: Mail, external: true },
    { href: "/contact", label: t("footer_helpdesk"), Icon: Headset },
    { href: "/app", label: t("footer_app_features"), Icon: Smartphone },
    { href: "/book-repair", label: t("nav_book_repair"), Icon: Wrench },
    { href: "/trade-in", label: t("nav_trade_in"), Icon: RefreshCw },
    { href: "/track", label: t("footer_orders_payments"), Icon: Receipt },
    { href: "/account", label: t("footer_account_mgmt"), Icon: User },
    { href: "/track", label: t("footer_shipping"), Icon: Truck },
    { href: "/contact", label: t("footer_warranty"), Icon: ShieldCheck },
    { href: "/diagnostics", label: t("nav_diagnostics"), Icon: Search },
    { href: user ? "/account" : "/register", label: t("footer_onboarding"), Icon: UserPlus },
  ];

  const shopLinks = [
    { href: "/accessories", label: t("footer_shop_accessories"), Icon: ShoppingBag },
    { href: "/smartphones", label: t("footer_shop_smartphones"), Icon: Smartphone },
    { href: "/tablets", label: t("footer_shop_tablets"), Icon: Tablet },
    { href: "/group/Hoco", label: t("nav_hoco"), Icon: Headphones },
    { href: "/cards", label: t("footer_shop_cards"), Icon: CreditCard },
    { href: "/new", label: t("footer_shop_new"), Icon: Star },
    { href: "/multi-brand", label: t("footer_shop_multibrand"), Icon: LayoutGrid },
  ];

  const policyLinks = [
    { href: LEGAL_LINKS.terms, label: t("footer_terms"), Icon: FileText },
    { href: LEGAL_LINKS.refunds, label: t("footer_refunds"), Icon: RotateCcw },
    { href: LEGAL_LINKS.shipping, label: t("footer_shipping_policy"), Icon: Truck },
    { href: LEGAL_LINKS.privacy, label: t("footer_privacy"), Icon: ShieldCheck },
  ];

  const benefits = [
    { Icon: Package, title: t("footer_bar_pack"), sub: t("footer_bar_pack_sub") },
    { Icon: Lock, title: t("footer_bar_pay"), sub: t("footer_bar_pay_sub") },
    { Icon: RefreshCw, title: t("footer_bar_returns"), sub: t("footer_bar_returns_sub") },
    { Icon: MessageCircle, title: t("footer_need_help"), sub: t("footer_bar_help_sub"), href: whatsappChatHref() },
  ];

  return (
    <footer id="footer" className="bg-brand text-white">
      <div className="h-1.5 w-full bg-sam" />
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <span className="mb-4 inline-flex rounded-md bg-white px-2.5 py-1.5">
              <BrandLogo className="h-8 w-auto" />
            </span>
            <p className="mb-5 max-w-[16.5rem] text-[13px] leading-relaxed text-white/70">{t("footer_tagline")}</p>
            <ul className="space-y-3.5">
              <TrustRow Icon={ShieldCheck} title={t("footer_trust_original")} sub={t("footer_trust_original_sub")} />
              <TrustRow Icon={Award} title={t("footer_trust_price")} sub={t("footer_trust_price_sub")} />
              <TrustRow Icon={Truck} title={t("footer_trust_delivery")} sub={t("footer_trust_delivery_sub")} />
              <TrustRow Icon={Headphones} title={t("footer_trust_support")} sub={t("footer_trust_support_sub")} />
            </ul>
            <div className="mt-6 flex items-center gap-2.5">
              <SocialButton href={STORE_SOCIAL.facebook} label="Facebook">
                <SiFacebook className="h-3.5 w-3.5" />
              </SocialButton>
              <SocialButton href={STORE_SOCIAL.instagram} label="Instagram">
                <SiInstagram className="h-3.5 w-3.5" />
              </SocialButton>
              <SocialButton href={whatsappChatHref()} label="WhatsApp">
                <SiWhatsapp className="h-3.5 w-3.5" />
              </SocialButton>
              <SocialButton href={`mailto:${STORE_EMAIL}`} label="Email">
                <Mail className="h-3.5 w-3.5" />
              </SocialButton>
            </div>
          </div>

          <div>
            <SectionTitle>{t("footer_customer_service")}</SectionTitle>
            <ul>
              {serviceLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle>{t("footer_shop")}</SectionTitle>
            <ul>
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle>{t("footer_policies")}</SectionTitle>
            <ul>
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink {...link} external compact />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle>{t("footer_contact")}</SectionTitle>
            <div className="space-y-3 typo-footer-contact text-white/85">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sam" strokeWidth={1.9} />
                <span>{STORE_ADDRESS}</span>
              </p>
              <a
                href={`tel:${STORE_PHONE.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 typo-footer-phone text-white hover:text-sam"
              >
                <Phone className="h-4 w-4 shrink-0 text-sam" strokeWidth={1.9} /> {STORE_PHONE}
              </a>
              <a href={`mailto:${STORE_EMAIL}`} className="flex items-center gap-2.5 font-bold text-white hover:text-sam">
                <Mail className="h-4 w-4 shrink-0 text-sam" strokeWidth={1.9} /> {STORE_EMAIL}
              </a>
            </div>
            <div className="mt-5 bg-sam p-4">
              <p className="mb-1.5 typo-newsletter-title text-[#111111]">Newsletter</p>
              <p className="mb-3 text-[13px] leading-5 text-[#333333]">{t("footer_newsletter_sub")}</p>
              {subscribed ? (
                <p className="text-[13px] font-normal leading-5 text-brand-dark">
                  {lang === "pt" ? "Subscrição ativa!" : "You're subscribed!"}
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email) setSubscribed(true);
                  }}
                  className="flex overflow-hidden rounded-md bg-white"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === "pt" ? "O seu email" : "Your email"}
                    className="h-11 min-w-0 flex-1 bg-transparent px-4 typo-input text-[#333333] outline-none placeholder:text-[#8B93A3]"
                    data-testid="input-newsletter"
                  />
                  <button
                    type="submit"
                    className="h-11 bg-brand px-4 typo-subscribe uppercase text-white hover:bg-brand-dark"
                    data-testid="button-subscribe"
                  >
                    {t("footer_subscribe")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-dark">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 px-5 py-4 sm:px-8 md:flex-row md:px-10 lg:px-14 xl:px-16">
          <p className="text-center text-[12px] font-semibold text-white/65 md:text-left">
            © {new Date().getFullYear()} SAMPHONE. Rua da Palma N.221-223, Lisboa.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-white">
            <FaCcVisa className="h-7 w-10" title="Visa" />
            <FaCcMastercard className="h-7 w-10" title="Mastercard" />
            <FaCcAmex className="h-7 w-10" title="American Express" />
            <FaCcPaypal className="h-7 w-10" title="PayPal" />
            <FaCcApplePay className="h-7 w-10" title="Apple Pay" />
          </div>
        </div>
      </div>

      <div className="bg-sam text-brand">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-5 py-5 sm:grid-cols-2 sm:px-8 md:grid-cols-4 md:px-10 lg:px-14 xl:px-16">
          {benefits.map((item) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <item.Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-bold leading-tight">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] text-brand/75">{item.sub}</span>
                </span>
              </>
            );
            return item.href ? (
              <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                {body}
              </a>
            ) : (
              <div key={item.title} className="flex items-center gap-3">
                {body}
              </div>
            );
          })}
        </div>
        <div className="border-t border-brand/20 px-5 py-3 text-center text-[12px] font-semibold text-brand/80">
          <a href={LEGAL_LINKS.livro} className="hover:text-brand-dark" target="_blank" rel="noreferrer">
            {t("footer_livro")}
          </a>
          <span className="mx-2 text-brand/30">·</span>
          {t("footer_developed_by")}{" "}
          <a
            href="https://bonusitsolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand-dark"
          >
            Bonus IT Solutions
          </a>
        </div>
      </div>
    </footer>
  );
}
