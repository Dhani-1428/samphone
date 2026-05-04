/** Allow only same-origin relative paths after login */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}
