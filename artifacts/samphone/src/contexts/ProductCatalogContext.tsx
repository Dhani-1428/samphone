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
  fetchProductsFirstBatch,
  fetchProductsPage,
  WooCommerceFetchError,
  type WooCategory,
  type WooProduct,
} from "@/lib/woocommerce";
import { hasWooCommerceConfig } from "@/config/woocommerce";

/** Bump when product payload shape changes (e.g. gallery normalization for GSMArena viewer). */
const CACHE_KEY = "samphone-products-cache-json-v4";
const CACHE_META_KEY = "samphone-products-cache-meta-v4";
const PER_PAGE = 100;
const CAT_CACHE_KEY = "samphone-woo-categories-cache-v1";
const CAT_META_KEY = "samphone-woo-categories-meta-v1";

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

function normalizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function ProductCatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [loading, setLoading] = useState(false);
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
      const raw = sessionStorage.getItem(CACHE_KEY) ?? localStorage.getItem(CACHE_KEY);
      const metaRaw = sessionStorage.getItem(CACHE_META_KEY) ?? localStorage.getItem(CACHE_META_KEY);
      if (!raw || !metaRaw) return null;
      const meta = JSON.parse(metaRaw) as { at: number };
      const items = JSON.parse(raw) as WooProduct[];
      setLastUpdated(meta.at);
      return Array.isArray(items) ? items : null;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback((items: WooProduct[]) => {
    const at = Date.now();
    const json = JSON.stringify(items);
    const meta = JSON.stringify({ at });
    try {
      sessionStorage.setItem(CACHE_KEY, json);
      sessionStorage.setItem(CACHE_META_KEY, meta);
      localStorage.setItem(CACHE_KEY, json);
      localStorage.setItem(CACHE_META_KEY, meta);
    } catch {
      /* ignore quota */
    }
    setLastUpdated(at);
  }, []);

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

      try {
        const [cr, first] = await Promise.allSettled([
          fetchCategories(),
          fetchProductsFirstBatch(PER_PAGE),
        ]);
        if (ac.signal.aborted || !mounted.current) return;

        if (first.status === "fulfilled") {
          firstBatch = first.value;
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
          setProducts([]);
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

      if (ac.signal.aborted || !mounted.current || firstBatch.length < PER_PAGE) return;

      setSyncingMore(true);
      try {
        let acc = [...firstBatch];
        let page = 2;
        while (!ac.signal.aborted && mounted.current) {
          const batch = await fetchProductsPage(page, PER_PAGE);
          if (ac.signal.aborted || !mounted.current) return;
          if (!batch.length) break;
          const seen = new Set(acc.map((p) => p.id));
          for (const p of batch) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              acc.push(p);
            }
          }
          setProducts(acc);
          writeCache(acc);
          if (batch.length < PER_PAGE) break;
          page += 1;
        }
      } finally {
        if (mounted.current) setSyncingMore(false);
      }
    },
    [writeCache, writeCategoryCache],
  );

  useEffect(() => {
    mounted.current = true;
    const cached = readCache();
    if (cached?.length) setProducts(cached);
    const catCached = readCategoryCache();
    if (catCached?.length) setCategories(catCached);
    if (hasWooCommerceConfig()) void refreshNow({ silent: Boolean(cached?.length) });
    return () => {
      mounted.current = false;
      fetchAbortRef.current?.abort();
    };
  }, [readCache, readCategoryCache, refreshNow]);

  const searchProducts = useCallback(
    (q: string, limit = 10): WooProduct[] => {
      const tokens = normalizeQuery(q);
      if (tokens.length === 0) return [];
      const lower = (s: string) => s.toLowerCase();
      const score = (p: WooProduct): number => {
        const hay = [p.name, ...(p.categories?.map((c) => c.name) ?? [])].map(lower).join(" ");
        let s = 0;
        for (const t of tokens) {
          if (hay.includes(t)) s += 2;
        }
        return s;
      };
      return [...products]
        .map((p) => ({ p, s: score(p) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map(({ p }) => p);
    },
    [products],
  );

  const hasCache = products.length > 0;

  const value = useMemo<ProductCatalogValue>(
    () => ({
      products,
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
      products,
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
