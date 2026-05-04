import { Link } from "wouter";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useLang } from "@/contexts/LanguageContext";
import ProductCard from "@/components/ProductCard";

export default function RecentlyViewedSection() {
  const { t } = useLang();
  const { products } = useRecentlyViewed();

  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background border-b border-border/70">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
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
