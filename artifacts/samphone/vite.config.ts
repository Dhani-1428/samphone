import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async ({ mode }) => {
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");
  const appRoot = path.resolve(import.meta.dirname);
  const env = {
    ...loadEnv(mode, workspaceRoot, ""),
    ...loadEnv(mode, appRoot, ""),
  };
  const wooProxyTarget = env.VITE_WOO_PROXY_TARGET || env.VITE_WOOCOMMERCE_STORE_URL;
  const useWooProxy = env.VITE_USE_WOO_PROXY === "true" && Boolean(wooProxyTarget);

  return {
  /**
   * Env for `import.meta.env` loads from this app folder (`artifacts/samphone/.env*`),
   * so `VITE_*` keys in `artifacts/samphone/.env.local` are picked up.
   * Monorepo root env is still merged below for the Woo proxy target in dev.
   */
  envDir: appRoot,
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, handler) {
        if (
          warning.message?.includes("Can't resolve original location of error")
        ) {
          return;
        }
        handler(warning);
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: env.VITE_PRICING_API_PROXY ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      ...(useWooProxy
        ? {
            "/woo-api": {
              target: wooProxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (p: string) => p.replace(/^\/woo-api/, ""),
            },
          }
        : {}),
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
};
});
