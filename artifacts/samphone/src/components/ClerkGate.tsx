import { Suspense, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { CLERK_JS_URL, CLERK_PUBLISHABLE_KEY } from "@/config/samphone";
import { installClerkLoadGuard, isClerkEnabled } from "@/lib/clerk-runtime";

/**
 * Mount Clerk when the script is available. If clerk-js times out, keep the shop
 * running on email/password login instead of covering the page with an error overlay.
 */
export default function ClerkGate({
  withClerk,
  withoutClerk,
}: {
  withClerk: ReactNode;
  withoutClerk: ReactNode;
}) {
  const wantClerk = isClerkEnabled();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!wantClerk) return;
    return installClerkLoadGuard(() => setFailed(true));
  }, [wantClerk]);

  if (!wantClerk || failed) return <>{withoutClerk}</>;

  return (
    <Suspense fallback={withoutClerk}>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        clerkJSUrl={CLERK_JS_URL}
        afterSignOutUrl="/"
        afterSignInUrl="/auth/continue"
        afterSignUpUrl="/auth/continue"
      >
        <AppErrorBoundary fallback={withoutClerk}>{withClerk}</AppErrorBoundary>
      </ClerkProvider>
    </Suspense>
  );
}
