import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { isClerkEnabled } from "@/lib/clerk-runtime";

/** Clerk OAuth handshake lands here, then continues to /auth/continue. */
export default function SsoCallback() {
  if (!isClerkEnabled()) {
    window.location.replace("/login");
    return null;
  }
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/auth/continue"
        signUpForceRedirectUrl="/auth/continue"
      />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
