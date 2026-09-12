import { safeRedirectPath } from "@/lib/safeRedirect";

export const ADMIN_HOME = "/admin";

export function isAdminRole(role?: string | null): boolean {
  return (role || "").trim().toLowerCase() === "admin";
}

const TEMPORARY_CLERK_B2C_EMAILS = new Set([
  "jagtar5510singh@gmail.com",
  "sts499340@gmail.com",
]);
const TEMPORARY_CLERK_B2C_PHONES = ["351920197514", "351920306889", "351920627617"];

function isTemporaryClerkB2c(user?: { email?: string; phone?: string } | null): boolean {
  const email = (user?.email || "").trim().toLowerCase();
  if (TEMPORARY_CLERK_B2C_EMAILS.has(email)) return true;
  const digits = (user?.phone || "").replace(/\D/g, "");
  if (!digits) return false;
  return TEMPORARY_CLERK_B2C_PHONES.some(
    (p) => digits === p || digits.endsWith(p.slice(-9)) || p.endsWith(digits.slice(-9)),
  );
}

export function isB2bAccount(user?: {
  accountType?: string;
  businessName?: string;
  vatNumber?: string;
  wholesaleStatus?: string;
  isWholesaleRole?: boolean;
  isWholesale?: boolean;
  source?: string;
  email?: string;
  phone?: string;
} | null): boolean {
  if (!user) return false;
  if (isTemporaryClerkB2c(user)) return false;
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
  if (isTemporaryClerkB2c(user)) return true;
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
