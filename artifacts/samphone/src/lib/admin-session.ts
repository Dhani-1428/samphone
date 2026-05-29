/** Admin API token — session only, never bundled via VITE_* */

const STORAGE_KEY = "samphone_admin_token";

export function getAdminToken(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

export function setAdminToken(token: string): void {
  if (typeof sessionStorage === "undefined") return;
  const t = token.trim();
  if (t) sessionStorage.setItem(STORAGE_KEY, t);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function clearAdminToken(): void {
  setAdminToken("");
}

export function adminAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}`, "X-Admin-Token": token } : {}),
  };
}
