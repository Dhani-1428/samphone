import { useLang } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { LEGAL_LINKS } from "@/config/samphone";

const FAQ_GROUPS: { title: "faq_g_general" | "faq_g_orders" | "faq_g_b2b" | "faq_g_repairs"; items: [string, string][] }[] = [
  {
    title: "faq_g_general",
    items: [
      ["faq_q_who", "faq_a_who"],
      ["faq_q_account", "faq_a_account"],
      ["faq_q_prices", "faq_a_prices"],
    ],
  },
  {
    title: "faq_g_orders",
    items: [
      ["faq_q_pay", "faq_a_pay"],
      ["faq_q_ship", "faq_a_ship"],
      ["faq_q_return", "faq_a_return"],
      ["faq_q_track", "faq_a_track"],
    ],
  },
  {
    title: "faq_g_b2b",
    items: [
      ["faq_q_wholesale", "faq_a_wholesale"],
      ["faq_q_vat", "faq_a_vat"],
    ],
  },
  {
    title: "faq_g_repairs",
    items: [
      ["faq_q_repair", "faq_a_repair"],
      ["faq_q_warranty", "faq_a_warranty"],
    ],
  },
];

export default function FaqPage() {
  const { t } = useLang();

  return (
    <div className="min-h-[70vh] bg-muted/20">
      <div className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("faq_eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{t("faq_title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("faq_sub")}</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[900px] space-y-8 px-5 py-10 sm:px-8">
        {FAQ_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="font-display text-lg font-bold">{t(group.title)}</h2>
            <div className="mt-3 space-y-2">
              {group.items.map(([q, a]) => (
                <details key={q} className="rounded-lg border border-border bg-card px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold">{t(q as "faq_q_who")}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(a as "faq_a_who")}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-sm">
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            {t("nav_contact")}
          </Link>
          {" · "}
          <Link href={LEGAL_LINKS.refunds} className="font-semibold text-primary hover:underline">
            {t("footer_refunds")}
          </Link>
          {" · "}
          <Link href={LEGAL_LINKS.shipping} className="font-semibold text-primary hover:underline">
            {t("footer_shipping_policy")}
          </Link>
        </p>
      </div>
    </div>
  );
}
