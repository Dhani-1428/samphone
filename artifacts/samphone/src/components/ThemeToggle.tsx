import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      aria-label={t("nav_dark_mode")}
      data-testid="button-theme-toggle"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-black/[0.08] bg-white px-2 text-[12px] font-medium text-brand transition-colors",
        "dark:border-white/15 dark:bg-[#1B2436] dark:text-[#C5D0E8]",
        showLabel ? "h-7" : "h-7 w-7 justify-center px-0",
        className,
      )}
    >
      {dark ? <Sun className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />}
      {showLabel ? t("nav_dark_mode") : null}
    </button>
  );
}
