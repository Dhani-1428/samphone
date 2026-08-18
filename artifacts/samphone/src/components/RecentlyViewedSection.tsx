import { Link } from "wouter";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useLang } from "@/contexts/LanguageContext";
import ProductCard from "@/components/ProductCard";

export default function RecentlyViewedSection() {
  const { t } = useLang();
  const { products } = useRecentlyViewed();

  if (products.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-navy md:text-[2rem]">
            {t("recently_viewed_title")}
          </h2>
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            {t("breadcrumb_home")}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          {products.slice(0, 10).map((p) => (
            <ProductCard key={p.cartKey} {...p} testPrefix="recent" />
          ))}
        </div>
      </div>
    </section>
  );
}
