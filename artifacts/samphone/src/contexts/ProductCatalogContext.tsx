import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCategories,
  WooCommerceFetchError,
  type WooCategory,
  type WooProduct,
} from "@/lib/woocommerce";
import { fetchCloudProductList } from "@/lib/samphone-cloud";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useAuth } from "@/contexts/AuthContext";
import { filterCatalogForCustomer, pricingAudience } from "@/lib/customer-price";
import { searchCatalogProducts } from "@/lib/model-search";

/** Bump when product payload shape changes (e.g. gallery normalization for GSMArena viewer). */
const CACHE_KEY = "samphone-products-cache-json-v9-cloud";
const CACHE_META_KEY = "samphone-products-cache-meta-v9-cloud";
const PER_PAGE = 200;
const CAT_CACHE_KEY = "samphone-woo-categories-cache-v2-cloud";
const CAT_META_KEY = "samphone-woo-categories-meta-v2-cloud";

interface ProductCatalogValue {
  products: WooProduct[];
  categories: WooCategory[];
  loading: boolean;
  error: string | null;
  categoriesError: string | null;
  /** Background pagination still fetching after first page. */
  syncingMore: boolean;
  refreshNow: (opts?: { silent?: boolean }) => Promise<void>;
  lastUpdated: number | null;
  hasCache: boolean;
  searchProducts: (q: string, limit?: number) => WooProduct[];
}

const DEFAULT_PRODUCT_CATALOG_VALUE: ProductCatalogValue = {
  products: [],
  categories: [],
  loading: false,
  error: null,
  categoriesError: null,
  syncingMore: false,
  refreshNow: async () => {},
  lastUpdated: null,
  hasCache: false,
  searchProducts: () => [],
};

const ProductCatalogContext = createContext<ProductCatalogValue>(DEFAULT_PRODUCT_CATALOG_VALUE);

export function ProductCatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const audience = pricingAudience(user);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>([]);
  /** True until first catalog paint when Woo is configured (avoids empty flash before effect). */
  const [loading, setLoading] = useState(() => hasWooCommerceConfig());
  const [error, setError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [syncingMore, setSyncingMore] = useState(false);
  const mounted = useRef(true);
  const productsLenRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);

  productsLenRef.current = products.length;

  const readCache = useCallback((): WooProduct[] | null => {
    try {
      const key = `${CACHE_KEY}-${audience}`;
      const metaKey = `${CACHE_META_KEY}-${audience}`;
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      const metaRaw = sessionStorage.getItem(metaKey) ?? localStorage.getItem(metaKey);
      if (!raw || !metaRaw) return null;
      const meta = JSON.parse(metaRaw) as { at: number };
      const items = JSON.parse(raw) as WooProduct[];
      setLastUpdated(meta.at);
      return Array.isArray(items) ? items : null;
    } catch {
      return null;
    }
  }, [audience]);

  const writeCache = useCallback((items: WooProduct[]) => {
    const at = Date.now();
    const json = JSON.stringify(items);
    const meta = JSON.stringify({ at });
    const key = `${CACHE_KEY}-${audience}`;
    const metaKey = `${CACHE_META_KEY}-${audience}`;
    try {
      sessionStorage.setItem(key, json);
      sessionStorage.setItem(metaKey, meta);
      localStorage.setItem(key, json);
      localStorage.setItem(metaKey, meta);
    } catch {
      /* ignore quota */
    }
    setLastUpdated(at);
  }, [audience]);

  const readCategoryCache = useCallback((): WooCategory[] | null => {
    try {
      const raw = sessionStorage.getItem(CAT_CACHE_KEY) ?? localStorage.getItem(CAT_CACHE_KEY);
      if (!raw) return null;
      const items = JSON.parse(raw) as WooCategory[];
      return Array.isArray(items) ? items : null;
    } catch {
      return null;
    }
  }, []);

  const writeCategoryCache = useCallback((items: WooCategory[]) => {
    const json = JSON.stringify(items);
    const meta = JSON.stringify({ at: Date.now() });
    try {
      sessionStorage.setItem(CAT_CACHE_KEY, json);
      sessionStorage.setItem(CAT_META_KEY, meta);
      localStorage.setItem(CAT_CACHE_KEY, json);
      localStorage.setItem(CAT_META_KEY, meta);
    } catch {
      /* ignore quota */
    }
  }, []);

  const refreshNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!hasWooCommerceConfig()) return;

      const silent = opts?.silent === true;
      const blocking = !silent && productsLenRef.current === 0;

      fetchAbortRef.current?.abort();
      const ac = new AbortController();
      fetchAbortRef.current = ac;

      if (blocking) setLoading(true);
      setError(null);
      setCategoriesError(null);

      let firstBatch: WooProduct[] = [];
      let catalogTotal = 0;
      let firstRaw = 0;
      let firstHasMore = false;

      try {
        const [cr, first] = await Promise.allSettled([
          fetchCategories(),
          fetchCloudProductList({ offset: "0" }, PER_PAGE),
        ]);
        if (ac.signal.aborted || !mounted.current) return;

        if (first.status === "fulfilled") {
          firstBatch = first.value.items;
          catalogTotal = first.value.total;
          firstRaw = first.value.rawCount;
          firstHasMore = first.value.hasMore;
          setProducts(firstBatch);
          writeCache(firstBatch);
        } else {
          const e = first.reason;
          const msg =
            e instanceof WooCommerceFetchError
              ? e.message
              : e instanceof Error
                ? e.message
                : "Unknown error";
          setError(msg);
          if (productsLenRef.current === 0) setProducts([]);
        }

        if (cr.status === "fulfilled") {
          setCategories(cr.value);
          writeCategoryCache(cr.value);
        } else {
          const e = cr.reason;
          const msg =
            e instanceof WooCommerceFetchError
              ? e.message
              : e instanceof Error
                ? e.message
                : "Unknown error";
          setCategoriesError(msg);
        }
      } finally {
        if (mounted.current && blocking) setLoading(false);
      }

      const more =
        firstHasMore ||
        (catalogTotal > 0 && firstRaw < catalogTotal) ||
        firstRaw >= PER_PAGE;
      if (ac.signal.aborted || !mounted.current || firstBatch.length === 0 || !more) return;

      setSyncingMore(true);
      try {
        let acc = [...firstBatch];
        const seen = new Set(acc.map((p) => p.id));
        let offset = firstRaw;
        while (!ac.signal.aborted && mounted.current) {
          const page = await fetchCloudProductList({ offset: String(offset) }, PER_PAGE);
          if (ac.signal.aborted || !mounted.current) return;
          if (page.rawCount === 0) break;
          let added = 0;
          for (const p of page.items) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            acc.push(p);
            added += 1;
          }
          if (added === 0) break;
          setProducts([...acc]);
          writeCache(acc);
          offset += page.rawCount;
          if (!page.hasMore) break;
          if (catalogTotal > 0 && offset >= catalogTotal) break;
        }
      } finally {
        if (mounted.current) setSyncingMore(false);
      }
    },
    [writeCache, writeCategoryCache, audience],
  );

  useEffect(() => {
    mounted.current = true;
    const cached = readCache();
    if (cached?.length) {
      setProducts(cached);
      setLoading(false);
    } else if (hasWooCommerceConfig()) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    const catCached = readCategoryCache();
    if (catCached?.length) setCategories(catCached);
    if (hasWooCommerceConfig()) void refreshNow({ silent: Boolean(cached?.length) });
    return () => {
      mounted.current = false;
      fetchAbortRef.current?.abort();
    };
  }, [readCache, readCategoryCache, refreshNow, isAuthenticated, audience]);

  const searchProducts = useCallback(
    (q: string, limit = 10): WooProduct[] => {
      const visible = filterCatalogForCustomer(products, user);
      return searchCatalogProducts(q, visible, limit);
    },
    [products, user],
  );

  const visibleProducts = useMemo(() => filterCatalogForCustomer(products, user), [products, user]);
  const hasCache = visibleProducts.length > 0;

  const value = useMemo<ProductCatalogValue>(
    () => ({
      products: visibleProducts,
      categories,
      loading,
      error,
      categoriesError,
      syncingMore,
      refreshNow,
      lastUpdated,
      hasCache,
      searchProducts,
    }),
    [
      visibleProducts,
      categories,
      loading,
      error,
      categoriesError,
      syncingMore,
      refreshNow,
      lastUpdated,
      hasCache,
      searchProducts,
    ],
  );

  return <ProductCatalogContext.Provider value={value}>{children}</ProductCatalogContext.Provider>;
}

export function useProductCatalog() {
  return useContext(ProductCatalogContext);
}
