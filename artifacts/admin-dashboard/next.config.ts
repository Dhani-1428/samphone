import type { NextConfig } from "next";

/** Step 8 — API proxy, images CDN, i18n */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.ADMIN_API_URL ?? "http://127.0.0.1:8090";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
