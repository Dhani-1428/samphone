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
  const isProd = mode === "production";
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");
  const appRoot = path.resolve(import.meta.dirname);
  const env = {
    ...loadEnv(mode, workspaceRoot, ""),
    ...loadEnv(mode, appRoot, ""),
  };

  return {
  /**
   * Only non-secret `VITE_*` vars are loaded here.
   * WooCommerce keys must live in artifacts/api-server/.env (server-side).
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
    sourcemap: !isProd,
    minify: isProd ? "esbuild" : false,
    cssMinify: isProd,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom")) return "react-dom";
          if (id.includes("node_modules/react/")) return "react";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@radix-ui")) return "radix";
        },
      },
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
  esbuild: {
    drop: isProd ? ["console", "debugger"] : [],
    legalComments: isProd ? "none" : "inline",
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
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: env.VITE_PRICING_API_PROXY ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
};
});
