import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import {
  Award,
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
  ShieldCheck,
  Sparkles,
  Speaker,
  Truck,
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

const MEGA_COL_1 = MEGA_ITEMS.slice(0, 7);
const MEGA_COL_2 = MEGA_ITEMS.slice(7);

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
      className="group flex items-center gap-3.5 border-b border-[#E8ECF2] px-5 py-3.5 last:border-b-0 hover:bg-[#F7F9FC]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[#E4E8EE] bg-[#F4F7FB] text-[#2B5CB8]">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block typo-accessory-item text-black">{group}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8B93A3]">{blurb}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C9CED6] transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
    </Link>
  );
}

function Benefit({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px] font-semibold text-[#1B2436]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2B5CB8]/40 text-[#2B5CB8]">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      {label}
    </li>
  );
}

export function AllAccessoriesMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid w-[min(74rem,calc(100vw-2rem))] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18.5rem,22rem)] bg-white">
      <div className="border-r border-[#E8ECF2]">
        {MEGA_COL_1.map((item) => (
          <MegaRow key={item.group} {...item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="border-r border-[#E8ECF2]">
        {MEGA_COL_2.map((item) => (
          <MegaRow key={item.group} {...item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="flex flex-col bg-[#F2F6FC] px-5 pb-5 pt-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <img
            src="/assets/accessories-mega-promo.jpg"
            alt="Phone, power bank, charger and earbuds"
            className="h-44 w-full object-cover object-center"
          />
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B5CB8]">
          Premium quality
        </p>
        <p className="mt-1.5 text-[20px] font-extrabold leading-snug text-[#121826]">
          Top Accessories for Your Devices
        </p>
        <p className="mt-2 text-[13px] leading-snug text-[#8B93A3]">
          Explore 1000+ original accessories at best prices.
        </p>
        <ul className="mt-4 space-y-2.5">
          <Benefit Icon={ShieldCheck} label="100% Original Products" />
          <Benefit Icon={Award} label="Best Price Guarantee" />
          <Benefit Icon={Truck} label="Fast & Secure Delivery" />
        </ul>
        <Link
          href="/accessories"
          onClick={onNavigate}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#163A86] text-[13px] font-bold uppercase tracking-[0.08em] text-white hover:bg-[#122F6C]"
        >
          Shop now
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
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
      <ul className={cn("py-1", className)}>
        {ACCESSORY_NAV_PAGES.map((page) => {
          const isActive = page.group.toLowerCase() === active;
          return (
            <li key={page.group}>
              <Link
                href={accessoryPageHref(page.group)}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left typo-accessory-item transition-colors",
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
