import type { WooProduct } from "@/lib/woocommerce";
import { classifyCatalogProduct } from "@/lib/catalog-taxonomy";
import { productBelongsToModel } from "@/lib/model-catalog";
import {
  parseSearchQuery,
  productNameMatchesModel,
  rankSearchResults as rankByName,
  type ParsedSearchQuery,
} from "@/lib/search-parse";

export {
  CANONICAL_MODELS,
  PRODUCT_TYPE_SYNONYMS,
  levenshtein,
  parseSearchQuery,
  rankSearchResults,
  productMatchesParsedQuery,
  productNameMatchesModel,
  type CanonicalModel,
  type ParsedSearchQuery,
  type ProductTypeSynonym,
} from "@/lib/search-parse";

export function catalogProductMatchesParsedQuery(p: WooProduct, parsed: ParsedSearchQuery): boolean {
  if (!parsed.raw) return true;
  if (parsed.type && classifyCatalogProduct(p).subcategory !== parsed.type.id) return false;
  if (parsed.model) {
    const labels = [parsed.model.label, parsed.model.slug.replace(/-/g, " "), ...parsed.model.aliases];
    const strict = labels.some((n) => productBelongsToModel(p, n));
    if (!strict && !productNameMatchesModel(p.name, parsed.model)) return false;
  }
  return true;
}

export type SearchAnalyticsEvent = {
  at: string;
  query: string;
  modelId: string | null;
  typeId: string | null;
  resultCount: number;
};

const ANALYTICS_KEY = "samphone-search-analytics-v1";

export function logSearchAnalytics(event: SearchAnalyticsEvent): void {
  try {
    const prev = JSON.parse(sessionStorage.getItem(ANALYTICS_KEY) || "[]") as SearchAnalyticsEvent[];
    const next = [...prev, event].slice(-80);
    sessionStorage.setItem(ANALYTICS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSearchAnalytics(): SearchAnalyticsEvent[] {
  try {
    const raw = sessionStorage.getItem(ANALYTICS_KEY);
    return raw ? (JSON.parse(raw) as SearchAnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function searchCatalogProducts(query: string, products: WooProduct[], limit = 40): WooProduct[] {
  const parsed = parseSearchQuery(query);
  if (parsed.model || parsed.type) {
    const matched = products.filter((p) => catalogProductMatchesParsedQuery(p, parsed));
    return rankByName(query, matched).slice(0, limit);
  }
  return rankByName(query, products).slice(0, limit);
}
