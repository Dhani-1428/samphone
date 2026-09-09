import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useLang } from "@/contexts/LanguageContext";
import HomeProductRail from "@/components/HomeProductRail";
import ProductCard from "@/components/ProductCard";

export default function RecentlyViewedSection() {
  const { t } = useLang();
  const { products } = useRecentlyViewed();

  if (products.length === 0) return null;

  return (
    <HomeProductRail title={t("recently_viewed_title")} seeAllHref="/wishlist">
      {products.slice(0, 12).map((p) => (
        <ProductCard key={p.cartKey} {...p} testPrefix="recent" />
      ))}
    </HomeProductRail>
  );
}
