import { safeRedirectPath } from "@/lib/safeRedirect";

export const ADMIN_HOME = "/admin/wholesale";

export function isAdminRole(role?: string | null): boolean {
  return (role || "").trim().toLowerCase() === "admin";
}

/** After a normal store login, admins land on the admin panel. */
export function postLoginPath(role: string | undefined, next: string): string {
  const dest = safeRedirectPath(next, "/");
  if (!isAdminRole(role)) return dest;
  if (dest === "/admin" || dest.startsWith("/admin/")) return dest;
  return ADMIN_HOME;
}
