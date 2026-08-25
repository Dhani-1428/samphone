import { Link } from "wouter";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { cn } from "@/lib/utils";

export default function AccessoryPageButtons({
  onNavigate,
  className,
  activeGroup,
}: {
  onNavigate?: () => void;
  className?: string;
  activeGroup?: string;
}) {
  const active = (activeGroup ?? "").toLowerCase();
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
