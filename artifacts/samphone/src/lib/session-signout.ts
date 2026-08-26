let clerkSignOut: (() => Promise<void>) | null = null;

export function registerClerkSignOut(fn: (() => Promise<void>) | null): void {
  clerkSignOut = fn;
}

export async function signOutClerkSession(): Promise<void> {
  try {
    await clerkSignOut?.();
  } catch {
    /* Clerk may be unavailable on this origin */
  }
}
