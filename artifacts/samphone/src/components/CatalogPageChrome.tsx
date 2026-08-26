import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function CatalogBackLink() {
  const { t } = useLang();
  return (
    <Link
      href="/"
      className="mb-8 mt-6 inline-flex items-center gap-2.5 text-sm font-medium text-navy transition-colors hover:text-[#2B5CB8]"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-sam text-sam">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      {t("backToHome")}
    </Link>
  );
}

export function CatalogSectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sam text-white">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-navy">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-[#5B6B86]">{hint}</p> : null}
      </div>
    </div>
  );
}

export function CatalogTypeChip({
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
        "relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-[#2B5CB8] text-white"
          : "border-black/[0.12] bg-white text-[#1F4E9E] hover:border-[#2B5CB8]/40",
      )}
    >
      {active ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-sam" aria-hidden /> : null}
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} /> : null}
      {children}
    </button>
  );
}
