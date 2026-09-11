import { CLERK_PUBLISHABLE_KEY } from "@/config/samphone";

/**
 * Live Clerk (`pk_live_` / clerk.samphone.cloud) on the public shop.
 * `pk_test_` only on localhost — never mix a second Clerk app on production.
 */
export function isClerkEnabled(): boolean {
  const key = CLERK_PUBLISHABLE_KEY.trim();
  if (!key) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (key.startsWith("pk_test_")) return isLocal;
  if (!key.startsWith("pk_live_")) return false;
  return !isLocal;
}
