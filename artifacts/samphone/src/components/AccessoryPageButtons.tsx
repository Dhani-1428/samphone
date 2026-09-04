import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import {
  Battery,
  BatteryCharging,
  Cable,
  Car,
  ChevronRight,
  Cpu,
  Ellipsis,
  Headphones,
  Laptop,
  Mic,
  PlugZap,
  Sparkles,
  Speaker,
  Watch,
} from "lucide-react";
import { ACCESSORY_NAV_PAGES, accessoryPageHref } from "@/data/accessory-pages";
import { cn } from "@/lib/utils";

const MEGA_ITEMS: { group: string; blurb: string; Icon: LucideIcon }[] = [
  { group: "Powerbanks", blurb: "Portable power on the go", Icon: BatteryCharging },
  { group: "Chargers", blurb: "Wall, USB & Fast chargers", Icon: PlugZap },
  { group: "Cables", blurb: "USB, Lightning & more", Icon: Cable },
  { group: "Headphones", blurb: "Wired & Wireless", Icon: Headphones },
  { group: "Speakers", blurb: "Portable & Bluetooth", Icon: Speaker },
  { group: "Smartwatch", blurb: "Smart style on your wrist", Icon: Watch },
  { group: "Mobile Car Support", blurb: "Mounts & Holders", Icon: Car },
  { group: "Laptop", blurb: "Accessories & more", Icon: Laptop },
  { group: "Audio & Microphone", blurb: "High quality sound", Icon: Mic },
  { group: "Electronics", blurb: "Smart gadgets & more", Icon: Cpu },
  { group: "Beautycare", blurb: "Personal care essentials", Icon: Sparkles },
  { group: "Cell AA/AAA", blurb: "Power for everyday", Icon: Battery },
  { group: "Original Accessories", blurb: "100% Original Products", Icon: Ellipsis },
];

function MegaRow({
  group,
  blurb,
  Icon,
  onNavigate,
}: {
  group: string;
  blurb: string;
  Icon: LucideIcon;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={accessoryPageHref(group)}
      onClick={onNavigate}
      className="group flex items-center gap-3 border-b border-[#E8ECF2] px-4 py-2.5 last:border-b-0 hover:bg-[#F7F9FC]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E8EE] bg-[#F4F7FB] text-brand">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight text-[#121826]">{group}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#8B93A3]">{blurb}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-[#C9CED6] transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.2}
      />
    </Link>
  );
}

export function AllAccessoriesMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="dropdown-type max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain bg-white">
      {MEGA_ITEMS.map((item) => (
        <MegaRow key={item.group} {...item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export default function AccessoryPageButtons({
  onNavigate,
  className,
  activeGroup,
  variant = "pills",
}: {
  onNavigate?: () => void;
  className?: string;
  activeGroup?: string;
  variant?: "pills" | "menu" | "mega";
}) {
  const active = (activeGroup ?? "").toLowerCase();
  if (variant === "mega") {
    return <AllAccessoriesMegaMenu onNavigate={onNavigate} />;
  }
  if (variant === "menu") {
    return (
      <ul className={cn("dropdown-type py-1", className)}>
        {ACCESSORY_NAV_PAGES.map((page) => {
          const isActive = page.group.toLowerCase() === active;
          return (
            <li key={page.group}>
              <Link
                href={accessoryPageHref(page.group)}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-[16px] font-bold leading-snug transition-colors",
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
