import { CLERK_PUBLISHABLE_KEY } from "@/config/samphone";

/**
 * Live Clerk (`pk_live_` / clerk.samphone.cloud) is allowed on the same hosts
 * as the Expo app + website CORS list. Test keys (`pk_test_`) work on localhost.
 * Elsewhere, skip Clerk so the storefront still loads with email/password login.
 */
export function isClerkEnabled(): boolean {
  const key = CLERK_PUBLISHABLE_KEY.trim();
  if (!key) return false;
  if (key.startsWith("pk_test_")) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return false;
  if (host === "samphone.cloud" || host.endsWith(".samphone.cloud")) return true;
  if (host === "samphone.pt" || host.endsWith(".samphone.pt")) return true;
  return false;
}
