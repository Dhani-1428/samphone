/** Allow only same-origin relative paths after login */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}

export function nextPathFromSearch(search: string): string {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return safeRedirectPath(new URLSearchParams(q).get("next"));
}
