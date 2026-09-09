import { Children, type ReactNode } from "react";
import { Link } from "wouter";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import { useLang } from "@/contexts/LanguageContext";

const navInset = "w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16";

export default function HomeProductRail({
  title,
  subtitle,
  seeAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref: string;
  children: ReactNode;
}) {
  const { t } = useLang();
  const heading = useTranslatedText(title);
  const sub = useTranslatedText(subtitle);
  const items = Children.toArray(children);

  return (
    <section className="py-8 md:py-10">
      <div className={navInset}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.65rem] font-extrabold tracking-tight text-brand md:text-[2.15rem]">{heading}</h2>
            <span className="mt-2 block h-[4px] w-12 rounded-full bg-sam" />
            {sub ? <p className="mt-2 text-sm text-muted-foreground">{sub}</p> : null}
          </div>
          <Link href={seeAllHref} className="shrink-0 text-sm font-extrabold uppercase tracking-wide text-brand hover:text-sam-dark">
            {t("newArrivals_see_all")}
          </Link>
        </div>

        {items.length <= 1 ? (
          <div>{items}</div>
        ) : (
          <div className="catalog-product-grid">
            {items.map((child, i) => (
              <div key={i} className="min-w-0">
                {child}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
