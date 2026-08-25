import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  Cable,
  Car,
  CreditCard,
  Fan,
  Headphones,
  Keyboard,
  LayoutGrid,
  Mic,
  Mouse,
  Plug,
  Smartphone,
  Sparkles,
  Speaker,
  Usb,
  Watch,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function subtypeIcon(label: string): LucideIcon {
  const k = label.toLowerCase();
  if (k.includes("adapter")) return Plug;
  if (k.includes("lightning")) return Zap;
  if (k.includes("wireless") && k.includes("charg")) return Wifi;
  if (k.includes("type-c") || k.includes("usb-c") || k.includes("hdmi")) return Cable;
  if (k.includes("micro")) return Usb;
  if (k.includes("power bank")) return BatteryCharging;
  if (k.includes("headphone") || k.includes("earphone") || k.includes("headset") || k.includes("audio")) return Headphones;
  if (k.includes("speaker")) return Speaker;
  if (k.includes("watch")) return Watch;
  if (k.includes("car")) return Car;
  if (k.includes("keyboard")) return Keyboard;
  if (k.includes("mice") || k.includes("mouse")) return Mouse;
  if (k.includes("mic")) return Mic;
  if (k.includes("fan") || k.includes("electronic")) return Fan;
  if (k.includes("beauty")) return Sparkles;
  if (k.includes("sim") || k.includes("memory") || k.includes("card") || k.includes("cell")) return CreditCard;
  if (k.includes("screw") || k.includes("opener") || k.includes("kit") || k.includes("tool")) return Wrench;
  if (k.includes("case") || k.includes("cover") || k.includes("jelly")) return Smartphone;
  return LayoutGrid;
}

export function FilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative isolate h-10 shrink-0 overflow-hidden rounded-full border px-4 text-sm font-medium transition-colors duration-300",
        active ? "border-sam text-white" : "border-black/[0.12] bg-white text-[#3d4a5c] hover:border-sam/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 origin-left bg-sam transition-transform duration-[400ms] ease-out",
          active ? "scale-x-100" : "scale-x-0",
        )}
      />
      <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
        {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} /> : null}
        {children}
      </span>
    </button>
  );
}
