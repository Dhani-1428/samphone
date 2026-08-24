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
import { fetchCloudMe } from "@/lib/samphone-cloud";

const STORAGE_KEY = "samphone-auth-user";

export interface AuthUser {
  email: string;
  name: string;
  token?: string;
  isWholesale?: boolean;
  wholesaleStatus?: string;
  accountType?: string;
  dealerTier?: string;
  phone?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
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
        isWholesale: parsed.isWholesale,
        wholesaleStatus: parsed.wholesaleStatus,
        accountType: parsed.accountType,
        dealerTier: parsed.dealerTier,
        phone: parsed.phone,
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
      isWholesale: next.isWholesale,
      wholesaleStatus: next.wholesaleStatus,
      accountType: next.accountType,
      dealerTier: next.dealerTier,
      phone: next.phone,
    };
    setUser(normalized);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: normalized.email,
        name: normalized.name,
        isWholesale: normalized.isWholesale,
        wholesaleStatus: normalized.wholesaleStatus,
        accountType: normalized.accountType,
        dealerTier: normalized.dealerTier,
        phone: normalized.phone,
      }),
    );
    setStoredApiJwt(normalized.token ?? null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setStoredApiJwt(null);
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
        isWholesale: me.isWholesale,
        wholesaleStatus: me.wholesaleStatus,
        accountType: me.accountType,
        dealerTier: me.dealerTier,
        phone: me.phone,
      };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: next.email,
          name: next.name,
          isWholesale: next.isWholesale,
          wholesaleStatus: next.wholesaleStatus,
          accountType: next.accountType,
          dealerTier: next.dealerTier,
          phone: next.phone,
        }),
      );
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
