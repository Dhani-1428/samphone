import { useMemo } from "react";
import { Link } from "wouter";
import CatalogLoading from "@/components/CatalogLoading";
import HomeProductRail from "@/components/HomeProductRail";
import ProductCartControls from "@/components/ProductCartControls";
import WooProductCard from "@/components/wc/WooProductCard";
import { NEW_ARRIVALS_PRODUCTS, hrefForCartKey } from "@/data/catalog";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { sortNewest } from "@/lib/woo-product-filters";

export default function HomeNewArrivals() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();
  const wooRows = useMemo(() => (woo ? sortNewest(products).slice(0, 14) : []), [woo, products]);

  if (woo && loading && wooRows.length === 0) {
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

  const cards =
    woo && wooRows.length > 0
      ? wooRows.map((product) => (
          <WooProductCard key={product.id} product={product} priceUnavailableLabel={t("woo_price_na")} />
        ))
      : NEW_ARRIVALS_PRODUCTS.map((product) => {
          const { daysAgo: _d, ...card } = product;
          const href = hrefForCartKey(card.cartKey);
          return (
            <article
              key={card.cartKey}
              className="flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10"
            >
              <Link href={href} className="block aspect-square p-4">
                <img src={card.img} alt={card.name} className="h-full w-full object-contain" />
              </Link>
              <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-navy">€{card.price.toFixed(2).replace(".", ",")}</span>
                  <ProductCartControls
                    cartKey={card.cartKey}
                    variant="icon-stepper"
                    preview={{ name: card.name, img: card.img }}
                  />
                </div>
                <Link href={href} className="line-clamp-2 text-[13px] font-medium text-navy">
                  {card.name}
                </Link>
              </div>
            </article>
          );
        });

  return (
    <HomeProductRail
      title={t("newArrivals_section_title")}
      subtitle={t("newArrivals_section_sub")}
      seeAllHref="/new"
    >
      {cards}
    </HomeProductRail>
  );
}
