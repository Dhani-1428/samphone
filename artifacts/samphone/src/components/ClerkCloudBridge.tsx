import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import { STORE_EMAIL } from "@/config/samphone";
import { clerkSync } from "@/lib/samphone-cloud";
import { registerClerkSignOut } from "@/lib/session-signout";
import { isAdminRole } from "@/lib/admin-access";

/** Keeps Clerk (app login) and the Samphone FastAPI JWT in sync. */
export default function ClerkCloudBridge() {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { login, user: appUser } = useAuth();
  const lastToken = useRef<string | null>(null);
  const appUserRef = useRef(appUser);
  appUserRef.current = appUser;

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
        const current = appUserRef.current;
        const clerkEmail =
          user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ||
          user?.emailAddresses?.find((row) => row.emailAddress)?.emailAddress?.trim().toLowerCase() ||
          "";
        const clerkPhone =
          user?.primaryPhoneNumber?.phoneNumber ||
          user?.phoneNumbers?.find((row) => row.phoneNumber)?.phoneNumber ||
          "";
        const storeInbox =
          (current?.email || "").trim().toLowerCase() === STORE_EMAIL.toLowerCase() ||
          clerkEmail === STORE_EMAIL.toLowerCase();
        // Password admin login must keep the FastAPI JWT. Clerk must not replace it.
        if (storeInbox) return;
        if (
          isAdminRole(current?.role) &&
          current?.email &&
          clerkEmail &&
          clerkEmail !== current.email.trim().toLowerCase()
        ) {
          return;
        }
        const meta = (user?.unsafeMetadata ?? {}) as Record<string, unknown>;
        const accountType =
          (typeof meta.accountType === "string" && meta.accountType) ||
          (typeof meta.account_type === "string" && meta.account_type) ||
          undefined;
        const result = await clerkSync(token, {
          name: user?.fullName || user?.firstName || undefined,
          email: clerkEmail || undefined,
          account_type: accountType,
          phone: clerkPhone || user?.primaryPhoneNumber?.phoneNumber,
          business_name: typeof meta.businessName === "string" ? meta.businessName : undefined,
          vat_number: typeof meta.vatNumber === "string" ? meta.vatNumber : undefined,
          business_type: typeof meta.businessType === "string" ? meta.businessType : undefined,
        });
        if (cancelled) return;
        const sameSession =
          current?.email === result.email &&
          current?.role === result.role &&
          (current?.token ?? "") === (result.token ?? "");
        if (sameSession) return;
        login({
          email: result.email,
          name: result.name,
          token: result.token ?? undefined,
          isWholesale: result.isWholesale,
          wholesaleStatus: result.wholesaleStatus,
          accountType: result.accountType || accountType,
          accountDiscountPercent: result.accountDiscountPercent,
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
  }, [isSignedIn, getToken, login, user]);

  return null;
}
