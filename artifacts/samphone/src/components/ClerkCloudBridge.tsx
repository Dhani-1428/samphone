import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import { clerkSync } from "@/lib/samphone-cloud";
import { registerClerkSignOut } from "@/lib/session-signout";

/** Keeps Clerk (app login) and the Samphone FastAPI JWT in sync. */
export default function ClerkCloudBridge() {
  const { isSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { login } = useAuth();
  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    registerClerkSignOut(async () => {
      lastToken.current = null;
      await signOut({ redirectUrl: "/" });
    });
    return () => registerClerkSignOut(null);
  }, [signOut]);

  useEffect(() => {
    if (!isSignedIn) {
      lastToken.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await getToken();
      if (cancelled || !token || token.length < 20 || token === lastToken.current) return;
      lastToken.current = token;
      try {
        const result = await clerkSync(token);
        if (cancelled) return;
        login({
          email: result.email,
          name: result.name,
          token: result.token ?? undefined,
          isWholesale: result.isWholesale,
          wholesaleStatus: result.wholesaleStatus,
          accountType: result.accountType,
          dealerTier: result.dealerTier,
          phone: result.phone,
          role: result.role,
          businessName: result.businessName,
          vatNumber: result.vatNumber,
          companyAddress: result.companyAddress,
          businessType: result.businessType,
          address: result.address,
          city: result.city,
          postalCode: result.postalCode,
          language: result.language,
          rejectionReason: result.rejectionReason,
          personalPricing: result.personalPricing,
        });
      } catch {
        lastToken.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken, login]);

  return null;
}
