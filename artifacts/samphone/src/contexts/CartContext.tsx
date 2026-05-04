import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CART_STORAGE_KEY = "samphone-cart-items-v1";

function loadCartFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string" || k.length === 0) continue;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

interface CartContextValue {
  items: Record<string, number>;
  getQty: (cartKey: string) => number;
  totalItems: number;
  /** When `maxQty` is set (e.g. stock), quantity will not exceed it. */
  increment: (cartKey: string, maxQty?: number) => void;
  decrement: (cartKey: string) => void;
  removeLine: (cartKey: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, number>>(() =>
    typeof window !== "undefined" ? loadCartFromStorage() : {},
  );

  useEffect(() => {
    try {
      if (Object.keys(items).length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      /* ignore quota */
    }
  }, [items]);

  const increment = useCallback((cartKey: string, maxQty?: number) => {
    setItems((prev) => {
      const cur = prev[cartKey] ?? 0;
      let next = cur + 1;
      if (maxQty != null) next = Math.min(next, maxQty);
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[cartKey];
        return copy;
      }
      return { ...prev, [cartKey]: next };
    });
  }, []);

  const decrement = useCallback((cartKey: string) => {
    setItems((prev) => {
      const q = (prev[cartKey] ?? 0) - 1;
      if (q <= 0) {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      }
      return { ...prev, [cartKey]: q };
    });
  }, []);

  const getQty = useCallback(
    (cartKey: string) => items[cartKey] ?? 0,
    [items],
  );

  const removeLine = useCallback((cartKey: string) => {
    setItems((prev) => {
      if (!(cartKey in prev)) return prev;
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems({});
  }, []);

  const totalItems = useMemo(
    () => Object.values(items).reduce((a, n) => a + n, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, getQty, totalItems, increment, decrement, removeLine, clearCart }),
    [items, getQty, totalItems, increment, decrement, removeLine, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
