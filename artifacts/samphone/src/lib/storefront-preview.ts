/** Private shop preview: password sheet + catalog UI (qty / stock, no cart). */
export const SITE_LOCK_PASSWORD = "RAHASAYA@SAMPHONE";
export const PRIVATE_PREVIEW = true;

export function hideStoreCart(): boolean {
  return PRIVATE_PREVIEW;
}
