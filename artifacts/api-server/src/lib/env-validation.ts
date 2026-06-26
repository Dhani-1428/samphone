import { logger } from "./logger";
import { isWooConfigured } from "./woocommerce-config";

const PLACEHOLDER_TOKEN_RE = /change-me|dev-admin|xxxxxxxx/i;

/** Warn at startup when secrets are missing or look like placeholders. */
export function validateServerEnv(): void {
  const issues: string[] = [];

  if (!process.env.PORT?.trim()) {
    issues.push("PORT is not set");
  }

  if (!isWooConfigured()) {
    issues.push("WooCommerce proxy not configured (WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET)");
  }

  const adminToken = process.env.PRICING_ADMIN_TOKEN?.trim() ?? "";
  if (!adminToken) {
    issues.push("PRICING_ADMIN_TOKEN is not set (admin pricing API disabled)");
  } else if (PLACEHOLDER_TOKEN_RE.test(adminToken)) {
    issues.push("PRICING_ADMIN_TOKEN looks like a placeholder — use a long random secret in production");
  }

  const cors = process.env.CORS_ORIGINS?.trim();
  if (process.env.NODE_ENV === "production" && !cors) {
    issues.push("CORS_ORIGINS is not set — API will accept requests from any origin");
  }

  if (issues.length > 0) {
    logger.warn({ issues }, "API server environment validation");
  }
}
