import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "samphone-wishlist-keys";
const MAX_WISHLIST = 80;

function readKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_WISHLIST);
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  keys: string[];
  add: (cartKey: string) => void;
  remove: (cartKey: string) => void;
  toggle: (cartKey: string) => void;
  has: (cartKey: string) => boolean;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<string[]>(() =>
    typeof window !== "undefined" ? readKeys() : [],
  );

  const persist = useCallback((next: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (cartKey: string) => {
      setKeys((prev) => {
        if (prev.includes(cartKey)) return prev;
        const next = [cartKey, ...prev].slice(0, MAX_WISHLIST);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (cartKey: string) => {
      setKeys((prev) => {
        const next = prev.filter((k) => k !== cartKey);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggle = useCallback(
    (cartKey: string) => {
      setKeys((prev) => {
        if (prev.includes(cartKey)) {
          const next = prev.filter((k) => k !== cartKey);
          persist(next);
          return next;
        }
        const next = [cartKey, ...prev].slice(0, MAX_WISHLIST);
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

  const has = useCallback((cartKey: string) => keys.includes(cartKey), [keys]);

  const value = useMemo(
    () => ({ keys, add, remove, toggle, has, clear }),
    [keys, add, remove, toggle, has, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
