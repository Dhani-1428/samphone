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
                  "flex w-full items-center px-4 py-2 text-left text-[14px] font-bold leading-snug transition-colors",
                  isActive
                    ? "bg-neutral-100 text-black"
                    : "text-black hover:bg-neutral-100 dark:text-white dark:hover:bg-white/10",
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
                ? "border-black bg-black text-white"
                : "border-black/[0.15] bg-white text-black hover:border-black hover:bg-black hover:text-white dark:border-white/15 dark:bg-[#1B2436] dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
            )}
          >
            {page.label}
          </Link>
        );
      })}
    </div>
  );
}
