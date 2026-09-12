import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/admin-access";

export default function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated || !user) {
    const next = encodeURIComponent(location || "/admin");
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.04]">
          <h1 className="font-display text-xl font-bold text-navy">Admin sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the store account. The admin panel opens automatically for the admin inbox.
          </p>
          <Link href={`/login?next=${next}`}>
            <Button className="w-full bg-brand text-white hover:bg-brand-dark">Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.04]">
          <h1 className="font-display text-xl font-bold text-navy">Not an admin account</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} is signed in, but this account cannot open the admin panel.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
