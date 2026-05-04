import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "samphone-compare-keys";
const MAX_COMPARE = 3;

function readKeys(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

interface CompareContextValue {
  keys: string[];
  add: (cartKey: string) => void;
  remove: (cartKey: string) => void;
  toggle: (cartKey: string) => void;
  has: (cartKey: string) => boolean;
  clear: () => void;
  canAdd: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<string[]>(() =>
    typeof window !== "undefined" ? readKeys() : [],
  );

  const persist = useCallback((next: string[]) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (cartKey: string) => {
      setKeys((prev) => {
        if (prev.includes(cartKey)) return prev;
        let next: string[];
        if (prev.length >= MAX_COMPARE) {
          next = [...prev.slice(1), cartKey];
        } else {
          next = [...prev, cartKey];
        }
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
        let next: string[];
        if (prev.length >= MAX_COMPARE) {
          next = [...prev.slice(1), cartKey];
        } else {
          next = [...prev, cartKey];
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setKeys([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const has = useCallback(
    (cartKey: string) => keys.includes(cartKey),
    [keys],
  );

  const canAdd = keys.length < MAX_COMPARE;

  const value = useMemo(
    () => ({
      keys,
      add,
      remove,
      toggle,
      has,
      clear,
      canAdd,
    }),
    [keys, add, remove, toggle, has, clear, canAdd],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
