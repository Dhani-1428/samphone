import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveCustomerPrice,
  type ResolvedPriceApiResponse,
} from "@/lib/pricing-api";
import type { WooProduct } from "@/lib/woocommerce";
import { getDisplayPrice } from "@/lib/woocommerce";
import { eurosToCents } from "@/lib/pricing-api";

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

export function CustomerPricingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const enabled = Boolean(user?.email);

  const resolveForProduct = useCallback(
    async (product: WooProduct, quantity = 1) => {
      if (!user?.email) return null;
      const display = getDisplayPrice(product);
      const basePriceCents = eurosToCents(display);
      const categoryIds = product.categories?.map((c) => c.slug) ?? [];

      return resolveCustomerPrice({
        customerEmail: user.email,
        wooProductId: product.id,
        basePriceCents,
        categoryIds,
        quantity,
      });
    },
    [user?.email],
  );

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["customer-pricing"] });
  }, [qc]);

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

/** Cached personalized price for a Woo product (storefront cards, PDP, cart). */
export function useCustomerProductPrice(product: WooProduct | null, quantity = 1) {
  const { user } = useAuth();
  const { resolveForProduct, enabled } = useCustomerPricing();

  const catalogCents = useMemo(() => {
    if (!product) return 0;
    return eurosToCents(getDisplayPrice(product));
  }, [product]);

  const query = useQuery({
    queryKey: ["customer-pricing", user?.email, product?.id, catalogCents, quantity],
    enabled: enabled && product != null && catalogCents > 0,
    staleTime: 60_000,
    queryFn: async () => {
      if (!product) return null;
      return resolveForProduct(product, quantity);
    },
  });

  const personalized = query.data;
  const displayCents = personalized?.displayPriceCents ?? catalogCents;
  const hasCustomPrice =
    personalized != null && personalized.resolved.source !== "catalog";

  return {
    loading: query.isLoading,
    displayCents,
    displayFormatted:
      personalized?.displayFormatted ??
      new Intl.NumberFormat(user?.email?.endsWith(".pt") ? "pt-PT" : "pt-PT", {
        style: "currency",
        currency: "EUR",
      }).format(displayCents / 100),
    hasCustomPrice,
    source: personalized?.resolved.source ?? "catalog",
    catalogCents,
  };
}
