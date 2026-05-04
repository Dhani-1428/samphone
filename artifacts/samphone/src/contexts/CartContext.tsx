import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface CartContextValue {
  items: Record<string, number>;
  getQty: (cartKey: string) => number;
  totalItems: number;
  /** When `maxQty` is set (e.g. stock), quantity will not exceed it. */
  increment: (cartKey: string, maxQty?: number) => void;
  decrement: (cartKey: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, number>>({});

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

  const clearCart = useCallback(() => {
    setItems({});
  }, []);

  const totalItems = useMemo(
    () => Object.values(items).reduce((a, n) => a + n, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, getQty, totalItems, increment, decrement, clearCart }),
    [items, getQty, totalItems, increment, decrement, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
