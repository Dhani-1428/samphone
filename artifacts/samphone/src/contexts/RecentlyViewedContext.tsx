import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveCatalogProduct } from "@/data/catalog";
import type { CatalogProduct } from "@/data/catalog";

const STORAGE_KEY = "samphone-recent-views";
const MAX = 12;

function readKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

interface RecentlyViewedContextValue {
  keys: string[];
  recordView: (cartKey: string) => void;
  products: CatalogProduct[];
  clear: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    setKeys(readKeys());
  }, []);

  const persist = useCallback((next: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const recordView = useCallback(
    (cartKey: string) => {
      setKeys((prev) => {
        const filtered = prev.filter((k) => k !== cartKey);
        const next = [cartKey, ...filtered].slice(0, MAX);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setKeys([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const products = useMemo(() => {
    const list: CatalogProduct[] = [];
    for (const k of keys) {
      const p = resolveCatalogProduct(k);
      if (p) list.push(p);
    }
    return list;
  }, [keys]);

  const value = useMemo(
    () => ({ keys, recordView, products, clear }),
    [keys, recordView, products, clear],
  );

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx)
    throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
