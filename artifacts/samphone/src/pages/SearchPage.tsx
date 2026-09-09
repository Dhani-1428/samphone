import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import WooProductCard from "@/components/wc/WooProductCard";
import CatalogLoading from "@/components/CatalogLoading";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useAuth } from "@/contexts/AuthContext";
import { filterCatalogForCustomer } from "@/lib/customer-price";
import { searchCatalogProducts } from "@/lib/model-search";
import { searchProductsRemote, type WooProduct } from "@/lib/woocommerce";

function mergeProducts(...lists: WooProduct[][]): WooProduct[] {
  const seen = new Set<string>();
  const out: WooProduct[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = String(p.cloudId || p.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export default function SearchPage() {
  const raw = useSearch();
  const q = (new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw).get("q") ?? "").trim();
  const { t } = useLang();
  const { user } = useAuth();
  const { products, loading, searchProducts } = useProductCatalog();
  const [remote, setRemote] = useState<WooProduct[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setRemote([]);
      setRemoteLoading(false);
      return;
    }
    let alive = true;
    setRemoteLoading(true);
    void searchProductsRemote(q, 200)
      .then((rows) => {
        if (alive) setRemote(rows);
      })
      .catch(() => {
        if (alive) setRemote([]);
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q]);

  const results = useMemo(() => {
    if (!q) return [];
    const local = searchProducts(q, 8000);
    const merged = filterCatalogForCustomer(mergeProducts(local, remote), user);
    return searchCatalogProducts(q, merged, 8000);
  }, [q, searchProducts, remote, user, products]);

  const busy = loading || remoteLoading;

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">
          {q ? t("smartphones_search_results", { query: q }) : t("searchPlaceholder")}
        </h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600">
          {q && !busy ? `${results.length}` : ""}
        </p>

        {busy && results.length === 0 ? <CatalogLoading className="mt-8 rounded-xl bg-white shadow-sm" /> : null}
        {busy && results.length > 0 ? <CatalogLoading compact className="mt-6 rounded-xl bg-white shadow-sm" /> : null}

        {!busy && q && results.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("search_no_results")}</p>
        ) : null}

        {results.length > 0 ? (
          <ul className="catalog-product-grid mt-8">
            {results.map((p) => (
              <li key={p.cloudId || p.id}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
