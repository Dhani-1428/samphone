import { safeRedirectPath } from "@/lib/safeRedirect";

export const ADMIN_HOME = "/admin";

export function isAdminRole(role?: string | null): boolean {
  return (role || "").trim().toLowerCase() === "admin";
}

export function isB2bAccount(user?: {
  accountType?: string;
  businessName?: string;
  vatNumber?: string;
  wholesaleStatus?: string;
  isWholesaleRole?: boolean;
  isWholesale?: boolean;
  source?: string;
} | null): boolean {
  if (!user) return false;
  const account = (user.accountType || "").trim().toLowerCase();
  const business = Boolean((user.businessName || "").trim() || (user.vatNumber || "").trim());
  const status = (user.wholesaleStatus || "").trim().toLowerCase();
  if (user.isWholesaleRole) return true;
  if (account === "b2b") return true;
  if (business) return true;
  if (status === "approved" || status === "rejected" || status === "suspended") return true;
  if (status === "pending" && (account === "b2b" || business)) return true;
  return false;
}

/** Clerk personal signup only. Unapproved / suspended B2B never counts as B2C. */
export function isB2cAccount(user?: Parameters<typeof isB2bAccount>[0]): boolean {
  if (!user) return false;
  if (isB2bAccount(user)) return false;
  const account = (user.accountType || "b2c").trim().toLowerCase();
  return account !== "b2b";
}

/** Screenshots / print / save-image: only the store admin inbox. */
export function canCaptureSite(user?: { email?: string; role?: string } | null): boolean {
  const email = (user?.email || "").trim().toLowerCase();
  return email === "samphone.pt@gmail.com" && isAdminRole(user?.role);
}

/** After a normal store login, admins land on the admin panel. */
export function postLoginPath(role: string | undefined, next: string): string {
  const dest = safeRedirectPath(next, "/");
  if (!isAdminRole(role)) return dest;
  if (dest === "/admin" || dest.startsWith("/admin/")) return dest;
  return ADMIN_HOME;
}
