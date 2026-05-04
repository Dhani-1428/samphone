import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCESSORIES_PRODUCTS,
  CARDS_PRODUCTS,
  DEAL_PRODUCTS,
  HOME_PRODUCTS,
  MULTI_BRAND_FEATURED,
  NEW_ARRIVALS_PRODUCTS,
  PHONE_PARTS,
  type CatalogProduct,
} from "@/data/catalog";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";

const STORAGE_KEY = "samphone-browse-affinity";

type Affinity = Record<string, number>;

function loadAffinity(): Affinity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) return {};
    return p as Affinity;
  } catch {
    return {};
  }
}

function scopeFromPath(path: string): string | null {
  const segs = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segs.length === 0) return "home";
  const first = segs[0];
  if (first === "smartphones") return "phones";
  if (first === "accessories") return "acc";
  if (first === "cards") return "cards";
  if (first === "new") return "new";
  if (first === "multi-brand") return "multi";
  if (first === "category") return "phones";
  if (first === "product" && segs[1]) {
    const scope = segs[1] === "cat" ? "cat" : segs[1];
    if (scope === "phones" || scope === "acc" || scope === "cards" || scope === "new" || scope === "home" || scope === "deal" || scope === "multi")
      return scope;
    return "product";
  }
  return null;
}

function productsForScope(scope: string): CatalogProduct[] {
  switch (scope) {
    case "phones":
      return [...PHONE_PARTS];
    case "acc":
      return [...ACCESSORIES_PRODUCTS];
    case "cards":
      return [...CARDS_PRODUCTS];
    case "new":
      return [...NEW_ARRIVALS_PRODUCTS];
    case "multi":
      return [...MULTI_BRAND_FEATURED];
    case "deal":
      return [...DEAL_PRODUCTS];
    case "home":
      return [...HOME_PRODUCTS];
    default:
      return [...HOME_PRODUCTS, ...PHONE_PARTS].slice(0, 8);
  }
}

interface BrowseBehaviorValue {
  recordFromPath: (path: string) => void;
  recommendedProducts: CatalogProduct[];
}

const BrowseBehaviorContext = createContext<BrowseBehaviorValue | null>(null);

export function BrowseBehaviorProvider({ children }: { children: ReactNode }) {
  const [affinity, setAffinity] = useState<Affinity>(() => loadAffinity());
  const { keys: recentKeys } = useRecentlyViewed();

  const persist = useCallback((next: Affinity) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const recordFromPath = useCallback(
    (path: string) => {
      const scope = scopeFromPath(path);
      if (!scope || scope === "cat" || scope === "product") return;
      setAffinity((prev) => {
        const next = { ...prev, [scope]: (prev[scope] ?? 0) + 1 };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const recommendedProducts = useMemo(() => {
    const merged = { ...affinity };
    const ranked = Object.entries(merged)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s)
      .slice(0, 3);
    const scopes = ranked.length ? ranked : ["phones", "acc", "home"];
    const recentSet = new Set(recentKeys);
    const out: CatalogProduct[] = [];
    const seen = new Set<string>();
    for (const sc of scopes) {
      for (const p of productsForScope(sc)) {
        if (seen.has(p.cartKey)) continue;
        if (recentSet.has(p.cartKey)) continue;
        seen.add(p.cartKey);
        out.push(p);
        if (out.length >= 8) return out;
      }
    }
    if (out.length < 4) {
      for (const p of HOME_PRODUCTS) {
        if (seen.has(p.cartKey)) continue;
        seen.add(p.cartKey);
        out.push(p);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [affinity, recentKeys]);

  const value = useMemo(
    () => ({ recordFromPath, recommendedProducts }),
    [recordFromPath, recommendedProducts],
  );

  return (
    <BrowseBehaviorContext.Provider value={value}>{children}</BrowseBehaviorContext.Provider>
  );
}

export function useBrowseBehavior() {
  const ctx = useContext(BrowseBehaviorContext);
  if (!ctx) throw new Error("useBrowseBehavior must be used within BrowseBehaviorProvider");
  return ctx;
}

/** Safe optional hook for components outside provider (should not happen). */
export function useBrowseBehaviorOptional() {
  return useContext(BrowseBehaviorContext);
}
