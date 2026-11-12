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

export function isClerkLoadFailure(value: unknown): boolean {
  const text =
    value instanceof Error
      ? `${value.name} ${value.message}`
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as { message: unknown }).message)
          : "";
  return /failed_to_load_clerk|failed to load clerk/i.test(text);
}

/** Swallow Clerk script timeouts so they cannot cover the shop with a Vite overlay. */
export function installClerkLoadGuard(onFail?: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const fail = (event: Event) => {
    const payload =
      event instanceof PromiseRejectionEvent
        ? event.reason
        : event instanceof ErrorEvent
          ? event.error ?? event.message
          : null;
    if (!isClerkLoadFailure(payload) && !(event instanceof ErrorEvent && isClerkLoadFailure(event.message))) {
      return;
    }
    event.preventDefault();
    onFail?.();
  };
  window.addEventListener("error", fail);
  window.addEventListener("unhandledrejection", fail);
  return () => {
    window.removeEventListener("error", fail);
    window.removeEventListener("unhandledrejection", fail);
  };
}
