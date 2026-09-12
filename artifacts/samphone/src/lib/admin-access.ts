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
} | null): boolean {
  if (!user) return false;
  const account = (user.accountType || "").trim().toLowerCase();
  const business = Boolean((user.businessName || "").trim() || (user.vatNumber || "").trim());
  if (account === "b2c") return business;
  if (account === "b2b") return true;
  return business || Boolean((user.wholesaleStatus || "").trim());
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
