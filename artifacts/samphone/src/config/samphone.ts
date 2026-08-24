/** Public Samphone FastAPI — same backend as the Expo app. No secrets here. */

export const SAMPHONE_CLOUD_ORIGIN = "https://samphone.cloud";

/** Same-origin prefix rewritten to https://samphone.cloud/api (avoids CORS on Vercel). */
export const SAMPHONE_API_BASE = (import.meta.env.VITE_SAMPHONE_API_URL ?? "/cloud-api").replace(/\/$/, "");

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "pk_live_Y2xlcmsuc2FtcGhvbmUuY2xvdWQk";

export const CLERK_FRONTEND_API =
  import.meta.env.VITE_CLERK_FRONTEND_API ?? "https://clerk.samphone.cloud";

export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ??
  "pk_live_51TsRh0IFNHslwSxObrZX8Fx7eneUwyjSeSj0QmbJJKB39lmLDrwNzGOjfk646Y4hacs0jyT9bJSPpGuk4hlojYTy00Ir71HQaq";

export const LEGAL_LINKS = {
  privacy: "https://samphone.pt/privacy-policy-and-data-protection",
  terms: "https://samphone.pt/terms-conditions",
  refunds: "https://samphone.pt/refund-return-policy",
  shipping: "https://samphone.pt/shipping-policy",
  livro: "https://www.livroreclamacoes.pt/Inicio",
} as const;

export const STORE_PHONE = "+351 937 119 295";
export const STORE_EMAIL = "samphone.pt@gmail.com";
export const STORE_ADDRESS = "R. da Palma N.221 223, 1100-391 Lisboa, Portugal";

export const JWT_STORAGE_KEY = "samphone-api-jwt";

export function getStoredApiJwt(): string | null {
  try {
    const t = sessionStorage.getItem(JWT_STORAGE_KEY) ?? localStorage.getItem(JWT_STORAGE_KEY);
    return t?.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredApiJwt(token: string | null): void {
  try {
    if (!token) {
      sessionStorage.removeItem(JWT_STORAGE_KEY);
      localStorage.removeItem(JWT_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(JWT_STORAGE_KEY, token);
    localStorage.setItem(JWT_STORAGE_KEY, token);
  } catch {
    /* ignore quota */
  }
}

export function isPlaceholderImage(src: string): boolean {
  return /woocommerce-placeholder|display-banner-samphone/i.test(src);
}

export function preferOriginalUpload(src: string): string {
  return src.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp|gif))/i, "");
}

/** Public homepage slides on www.samphone.pt (1500×600). */
export const SITE_HOME_BANNERS = [
  "https://www.samphone.pt/wp-content/uploads/2026/08/banner-1.png",
  "https://www.samphone.pt/wp-content/uploads/2026/08/ban-2.png",
  "https://www.samphone.pt/wp-content/uploads/2026/08/ban-3.png",
  "https://www.samphone.pt/wp-content/uploads/2026/07/BAN-2.png",
  "https://www.samphone.pt/wp-content/uploads/2026/06/BAN-B2.png",
] as const;

export function normalizeCatalogImageUrl(src: string | null | undefined): string | null {
  const raw = typeof src === "string" ? src.trim() : "";
  if (!raw || isPlaceholderImage(raw)) return null;
  try {
    const u = new URL(raw, "https://www.samphone.pt");
    if (u.hostname === "samphone.pt") u.hostname = "www.samphone.pt";
    return u.toString();
  } catch {
    return raw.startsWith("http") ? raw : null;
  }
}

/**
 * Third-party CDNs must not receive a samphone.pt Referer.
 * WordPress uploads on samphone.pt can use the default referrer.
 */
export function catalogImageReferrerPolicy(src: string): "no-referrer" | "strict-origin-when-cross-origin" {
  if (/tudo4mobile|woocommerce-placeholder/i.test(src)) return "no-referrer";
  if (/samphone\.pt/i.test(src)) return "strict-origin-when-cross-origin";
  return "no-referrer";
}
