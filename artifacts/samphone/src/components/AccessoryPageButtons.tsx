import { Link } from "wouter";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { cn } from "@/lib/utils";

export default function AccessoryPageButtons({
  onNavigate,
  className,
  activeGroup,
  variant = "pills",
}: {
  onNavigate?: () => void;
  className?: string;
  activeGroup?: string;
  variant?: "pills" | "menu";
}) {
  const active = (activeGroup ?? "").toLowerCase();
  if (variant === "menu") {
    return (
      <ul className={cn("py-1", className)}>
        {ACCESSORY_NAV_PAGES.map((page) => {
          const isActive = page.group.toLowerCase() === active;
          return (
            <li key={page.group}>
              <Link
                href={accessoryPageHref(page.group)}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-[13px] leading-snug transition-colors",
                  isActive
                    ? "bg-[#F4F7FB] font-semibold text-[#5A73A8]"
                    : "text-[#3d4a5c] hover:bg-[#F4F7FB] hover:text-[#5A73A8] dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {ACCESSORY_NAV_PAGES.map((page) => {
        const isActive = page.group.toLowerCase() === active;
        return (
          <Link
            key={page.group}
            href={accessoryPageHref(page.group)}
            onClick={onNavigate}
            className={cn(
              "inline-flex h-10 min-w-[9.5rem] items-center justify-center rounded-md border px-3.5 text-center text-[13px] font-semibold transition-colors",
              isActive
                ? "border-sam bg-sam text-white"
                : "border-black/[0.1] bg-white text-brand-dark hover:border-sam hover:bg-sam hover:text-white dark:border-white/15 dark:bg-[#1B2436] dark:text-white dark:hover:border-sam dark:hover:bg-sam",
            )}
          >
            {page.label}
          </Link>
        );
      })}
    </div>
  );
}
