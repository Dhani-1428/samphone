import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import type { AuthUser } from "@/contexts/AuthContext";
import { ACCOUNT_NAV, type AccountSectionId } from "@/components/account/account-sections";

type Props = {
  user: AuthUser;
  section: AccountSectionId;
  onNavigate: (id: AccountSectionId) => void;
  onLogout: () => void;
};

export default function AccountSidebar({ user, section, onNavigate, onLogout }: Props) {
  const { t } = useLang();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit lg:sticky lg:top-24">
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-display font-bold text-lg shrink-0 shadow-inner">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      <nav className="p-3 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto hide-dropdown-scrollbar">
        {ACCOUNT_NAV.map((group) => (
          <div key={group.titleKey ?? "misc"}>
            {group.titleKey ? (
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.titleKey)}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = section === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/80 hover:bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("auth_logout")}
        </Button>
        <p className="px-3 pt-2 text-[11px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
        </p>
      </div>
    </aside>
  );
}
