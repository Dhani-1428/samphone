import { CLERK_PUBLISHABLE_KEY } from "@/config/samphone";

/**
 * Live Clerk (`pk_live_` / clerk.samphone.eu) on the shop and localhost.
 * `pk_test_` stays local-only so a second test instance never ships to production.
 */
export function isClerkEnabled(): boolean {
  const key = CLERK_PUBLISHABLE_KEY.trim();
  if (!key) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (key.startsWith("pk_test_")) return isLocal;
  return key.startsWith("pk_live_");
}
