import { useMemo } from "react";
import HomeProductRail from "@/components/HomeProductRail";
import WooProductCard from "@/components/wc/WooProductCard";
import ProductCard from "@/components/ProductCard";
import { useLang } from "@/contexts/LanguageContext";
import { DEAL_PRODUCTS } from "@/data/catalog";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { filterOnSale, sortNewest } from "@/lib/woo-product-filters";

export default function Deals() {
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();

  const deals = useMemo(() => {
    const reservedIds = new Set(sortNewest(products).slice(0, 28).map((p) => p.id));
    const onSale = filterOnSale(products).filter((p) => !reservedIds.has(p.id));
    if (onSale.length > 0) return onSale.slice(0, 14);
    const fallbackSale = filterOnSale(products);
    if (fallbackSale.length > 0) return fallbackSale.slice(0, 14);
    return products.filter((p) => !reservedIds.has(p.id)).slice(0, 14);
  }, [products]);

  const cards =
    woo && deals.length > 0
      ? deals.map((p) => <WooProductCard key={p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />)
      : woo && loading
        ? [
            <div
              key="loading"
              className="flex h-64 items-center justify-center rounded-xl bg-card text-sm text-muted-foreground"
            >
              {t("woo_loading")}
            </div>,
          ]
        : DEAL_PRODUCTS.map((deal) => <ProductCard key={deal.cartKey} {...deal} testPrefix="deal" />);

  return (
    <div id="deals">
      <HomeProductRail title={t("crazy_deals_title")} seeAllHref="/accessories">
        {cards}
      </HomeProductRail>
    </div>
  );
}
