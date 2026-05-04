/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WOOCOMMERCE_STORE_URL: string;
  readonly VITE_WOOCOMMERCE_CONSUMER_KEY: string;
  readonly VITE_WOOCOMMERCE_CONSUMER_SECRET: string;
  /** Dev only: fetch via Vite proxy to avoid CORS (see vite.config.ts). */
  readonly VITE_USE_WOO_PROXY?: string;
  /** Optional override for proxy target (defaults to VITE_WOOCOMMERCE_STORE_URL). */
  readonly VITE_WOO_PROXY_TARGET?: string;
  /** Prepended to numeric price from WooCommerce (e.g. € or $). */
  readonly VITE_WOOCOMMERCE_CURRENCY_SYMBOL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
