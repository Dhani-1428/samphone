import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredApiJwt, setStoredApiJwt } from "@/config/samphone";
import { fetchCloudMe, type CloudProfile } from "@/lib/samphone-cloud";
import type { PersonalPricingRule } from "@/lib/customer-price";
import { signOutClerkSession } from "@/lib/session-signout";

const STORAGE_KEY = "samphone-auth-user";

export interface AuthUser {
  email: string;
  name: string;
  token?: string;
  role?: string;
  isWholesale?: boolean;
  wholesaleStatus?: string;
  accountType?: string;
  dealerTier?: string;
  phone?: string;
  businessName?: string;
  vatNumber?: string;
  companyAddress?: string;
  businessType?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  language?: string;
  rejectionReason?: string;
  personalPricing?: PersonalPricingRule[];
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

function profileFields(src: Partial<AuthUser> | CloudProfile | null | undefined): Omit<AuthUser, "email" | "name" | "token"> {
  if (!src) return {};
  return {
    role: src.role,
    isWholesale: src.isWholesale,
    wholesaleStatus: src.wholesaleStatus,
    accountType: src.accountType,
    dealerTier: src.dealerTier,
    phone: src.phone,
    businessName: src.businessName,
    vatNumber: src.vatNumber,
    companyAddress: src.companyAddress,
    businessType: src.businessType,
    address: src.address,
    city: src.city,
    postalCode: src.postalCode,
    country: src.country,
    language: src.language,
    rejectionReason: src.rejectionReason,
    personalPricing: src.personalPricing,
  };
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.email && typeof parsed.email === "string") {
      return {
        email: parsed.email,
        name: typeof parsed.name === "string" ? parsed.name : parsed.email.split("@")[0],
        token: getStoredApiJwt() ?? undefined,
        ...profileFields(parsed),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = useCallback((next: AuthUser) => {
    const normalized: AuthUser = {
      email: next.email.trim(),
      name: next.name.trim() || next.email.split("@")[0],
      token: next.token,
      ...profileFields(next),
    };
    setUser(normalized);
    const { token: _t, ...stored } = normalized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setStoredApiJwt(normalized.token ?? null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setStoredApiJwt(null);
    void signOutClerkSession();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getStoredApiJwt()) return;
    const me = await fetchCloudMe();
    if (!me?.email) return;
    setUser((prev) => {
      const next: AuthUser = {
        email: me.email,
        name: me.name,
        token: prev?.token ?? getStoredApiJwt() ?? undefined,
        ...profileFields(me),
      };
      const { token: _t, ...stored } = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return next;
    });
  }, []);

  useEffect(() => {
    if (getStoredApiJwt()) void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: user !== null,
      refreshProfile,
    }),
    [user, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
