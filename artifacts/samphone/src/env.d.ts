/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public store URL (display / links only). */
  readonly VITE_WOOCOMMERCE_STORE_URL?: string;
  /** Server-side WooCommerce proxy path (no secrets). */
  readonly VITE_WOO_API_BASE?: string;
  /** Prepended to numeric price from WooCommerce (e.g. €). */
  readonly VITE_WOOCOMMERCE_CURRENCY_SYMBOL?: string;
  readonly VITE_PRICING_API_URL?: string;
  readonly VITE_WOO_EXTRA_PHONE_CATEGORY_SLUGS?: string;
  readonly VITE_WOO_EXTRA_TABLET_CATEGORY_SLUGS?: string;
  /** Must stay false in production — enables insecure client-side Woo keys. */
  readonly VITE_WOO_USE_CLIENT_CREDENTIALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
