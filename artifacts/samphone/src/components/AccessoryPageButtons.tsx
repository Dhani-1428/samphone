import { Link } from "wouter";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { cn } from "@/lib/utils";

export default function AccessoryPageButtons({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {ACCESSORY_NAV_PAGES.map((page) => (
        <Link
          key={page.group}
          href={accessoryPageHref(page.group)}
          onClick={onNavigate}
          className="inline-flex h-10 min-w-[9.5rem] items-center justify-center rounded-md border border-black/[0.1] bg-white px-3.5 text-center text-[13px] font-semibold text-brand-dark transition-colors hover:border-sam hover:bg-sam hover:text-white dark:border-white/15 dark:bg-[#1B2436] dark:text-white dark:hover:border-sam dark:hover:bg-sam"
        >
          {page.label}
        </Link>
      ))}
    </div>
  );
}
