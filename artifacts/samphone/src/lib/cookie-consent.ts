export const COOKIE_CONSENT_KEY = "samphone_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_SETTINGS_EVENT = "samphone-open-cookie-settings";

export type CookieConsent = {
  v: number;
  at: string;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

export function readCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.v !== COOKIE_CONSENT_VERSION || parsed.necessary !== true || typeof parsed.at !== "string") {
      return null;
    }
    return {
      v: COOKIE_CONSENT_VERSION,
      at: parsed.at,
      necessary: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(partial: Omit<CookieConsent, "v" | "at" | "necessary">): CookieConsent {
  const next: CookieConsent = {
    v: COOKIE_CONSENT_VERSION,
    at: new Date().toISOString(),
    necessary: true,
    preferences: Boolean(partial.preferences),
    analytics: Boolean(partial.analytics),
    marketing: Boolean(partial.marketing),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("samphone-cookie-consent-changed"));
  return next;
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}
