import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ResolvedPriceApiResponse } from "@/lib/pricing-api";
import type { WooProduct } from "@/lib/woocommerce";
import { eurosToCents } from "@/lib/pricing-api";
import { catalogUnitPrice, formatEuroAmount } from "@/lib/customer-price";

interface CustomerPricingContextValue {
  enabled: boolean;
  customerId: string | null;
  resolveForProduct: (
    product: WooProduct,
    quantity?: number,
  ) => Promise<ResolvedPriceApiResponse | null>;
  invalidate: () => void;
}

const CustomerPricingContext = createContext<CustomerPricingContextValue | null>(null);

function localResolvedPrice(
  product: WooProduct,
  email: string | undefined,
  user: ReturnType<typeof useAuth>["user"],
): ResolvedPriceApiResponse {
  const euros = catalogUnitPrice(product, user) ?? 0;
  const cents = eurosToCents(euros);
  const hasCustom = Boolean(user?.personalPricing?.length || user?.accountDiscountPercent);
  return {
    customerId: email ?? "",
    resolved: {
      unitPriceCents: cents,
      basePriceCents: cents,
      source: hasCustom ? "personal_discount" : "catalog",
      vatRate: 0.23,
      vatMode: "inclusive",
    },
    displayPriceCents: cents,
    displayFormatted: formatEuroAmount(euros),
    netCents: cents,
    grossCents: cents,
  };
}

export function CustomerPricingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = Boolean(user?.email);

  const resolveForProduct = useCallback(
    async (product: WooProduct, _quantity = 1) => {
      if (!user?.email) return null;
      return localResolvedPrice(product, user.email, user);
    },
    [user],
  );

  const invalidate = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      enabled,
      customerId: null,
      resolveForProduct,
      invalidate,
    }),
    [enabled, resolveForProduct, invalidate],
  );

  return (
    <CustomerPricingContext.Provider value={value}>{children}</CustomerPricingContext.Provider>
  );
}

export function useCustomerPricing() {
  const ctx = useContext(CustomerPricingContext);
  if (!ctx) {
    throw new Error("useCustomerPricing must be used within CustomerPricingProvider");
  }
  return ctx;
}

/** Personalized price for a Woo product. Uses catalog + session discounts — no per-card API call. */
export function useCustomerProductPrice(product: WooProduct | null, _quantity = 1) {
  const { user } = useAuth();

  const catalogCents = useMemo(() => {
    if (!product) return 0;
    return eurosToCents(catalogUnitPrice(product, user));
  }, [product, user]);

  const hasCustomPrice = Boolean(
    product && (user?.personalPricing?.length || user?.accountDiscountPercent),
  );

  return {
    loading: false,
    displayCents: catalogCents,
    displayFormatted:
      catalogCents <= 0
        ? ""
        : formatEuroAmount(catalogCents / 100),
    hasCustomPrice,
    source: hasCustomPrice ? "personal_discount" : "catalog",
    catalogCents,
  };
}
