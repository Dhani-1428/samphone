import type { HelmetOptions } from "helmet";

const isProduction = process.env.NODE_ENV === "production";

/** Helmet options for the JSON API server. */
export function getApiHelmetOptions(): HelmetOptions {
  return {
    // API returns JSON, not HTML — CSP on responses is optional.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
      : false,
  };
}
