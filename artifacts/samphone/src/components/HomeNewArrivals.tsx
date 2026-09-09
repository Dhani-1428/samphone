import { useEffect, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { pricingAudience } from "@/lib/customer-price";
import { fetchCloudNewArrivals } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

export default function HomeNewArrivals() {
  const { t } = useLang();
  const { user } = useAuth();
  const audience = pricingAudience(user);
  const [wooRows, setWooRows] = useState<WooProduct[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchCloudNewArrivals(12)
      .then((rows) => {
        if (alive) setWooRows(rows);
      })
      .catch(() => {
        if (alive) setWooRows([]);
      });
    return () => {
      alive = false;
    };
  }, [audience]);

  if (wooRows == null) {
    return (
      <HomeProductRail
        title={t("newArrivals_section_title")}
        subtitle={t("newArrivals_section_sub")}
        seeAllHref="/new"
      >
        <CatalogLoading compact />
      </HomeProductRail>
    );
  }

  if (wooRows.length === 0) return null;

  return (
    <HomeProductRail
      title={t("newArrivals_section_title")}
      subtitle={t("newArrivals_section_sub")}
      seeAllHref="/new"
    >
      {wooRows.map((product) => (
        <WooProductCard key={product.cloudId || product.id} product={product} priceUnavailableLabel={t("woo_price_na")} compact />
      ))}
    </HomeProductRail>
  );
}
