import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { postLoginPath } from "@/lib/admin-access";
import { nextPathFromSearch } from "@/lib/safeRedirect";

/** Clerk widget lands here so admins are sent to the panel after session sync. */
export default function AuthContinue() {
  const { user, isAuthenticated } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const next = nextPathFromSearch(search);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setLocation(postLoginPath(user.role, next));
  }, [isAuthenticated, next, setLocation, user]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
