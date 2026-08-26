import { CLERK_PUBLISHABLE_KEY } from "@/config/samphone";

/**
 * Live Clerk keys only work on samphone.cloud (and its subdomains).
 * Test keys (`pk_test_`) can run on localhost. Anywhere else, skip Clerk
 * so the storefront still loads with email/password login.
 */
export function isClerkEnabled(): boolean {
  const key = CLERK_PUBLISHABLE_KEY.trim();
  if (!key) return false;
  if (key.startsWith("pk_test_")) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "samphone.cloud" || host.endsWith(".samphone.cloud");
}
