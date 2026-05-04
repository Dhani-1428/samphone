import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "samphone-auth-user";

export interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
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
    };
    setUser(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: user !== null,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
