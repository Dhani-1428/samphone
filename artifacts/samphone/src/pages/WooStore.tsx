import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";

export default function WooStore() {
  const { t } = useLang();
  const { products, loading, error, refreshNow, lastUpdated, hasCache, syncingMore } = useProductCatalog();
  const configured = hasWooCommerceConfig();
  const showBlockingLoader = loading && !hasCache;

  return (
    <div className="min-h-screen">
      <PageVideoHero
        eyebrow={`${t("breadcrumb_home")} / ${t("woo_store_title")}`}
        title={t("woo_store_title")}
        description={t("woo_store_sub")}
      />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        {!configured && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">{t("woo_env_title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("woo_env_body")}</p>
          </div>
        )}

        {configured && !loading && hasCache && lastUpdated && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5"
              onClick={() => void refreshNow({ silent: true })}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Sync now
            </Button>
          </div>
        )}

        {configured && syncingMore && products.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            {t("woo_syncing_more")}
          </p>
        )}

        {showBlockingLoader && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {!showBlockingLoader && error && (
          <div
            className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
            role="alert"
          >
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-foreground">{t("woo_error")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" className="mt-6 gap-2" onClick={() => void refreshNow({ silent: true })}>
              <RefreshCw className="h-4 w-4" />
              {t("woo_retry")}
            </Button>
          </div>
        )}

        {!showBlockingLoader && !error && products.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
        )}

        {!showBlockingLoader && !error && products.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5">
            {products.map((p) => (
              <li key={p.id}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
