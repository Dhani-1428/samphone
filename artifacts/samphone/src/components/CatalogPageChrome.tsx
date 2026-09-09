import type { LucideIcon } from "lucide-react";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import { cn } from "@/lib/utils";

export function CatalogBackLink() {
  return null;
}

export function CatalogSectionHeading({
  icon: Icon,
  title,
  highlight,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  highlight?: string;
  hint?: string;
}) {
  const large = Boolean(highlight);
  const heading = useTranslatedText(title);
  const mark = useTranslatedText(highlight);
  const note = useTranslatedText(hint);
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-xl bg-sam text-white ${
          large ? "h-12 w-12" : "h-11 w-11"
        }`}
      >
        <Icon className={large ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2.2} />
      </span>
      <div>
        <h2
          className={`font-display font-extrabold tracking-tight ${
            large ? "text-[1.95rem] leading-tight text-navy sm:text-[2.25rem]" : "text-[1.65rem] text-brand"
          }`}
        >
          {highlight ? (
            <>
              {heading}{" "}
              <span className="text-sam underline decoration-sam decoration-[3px] underline-offset-4">{mark}</span>
            </>
          ) : (
            heading
          )}
        </h2>
        {note ? <p className="mt-0.5 text-sm font-semibold text-neutral-700">{note}</p> : null}
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
  const label = useTranslatedText(children);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg border px-3.5 text-sm font-bold transition-colors",
        active
          ? "border-transparent bg-sam text-white"
          : "border-brand/20 bg-white text-brand hover:border-sam",
      )}
    >
      {active ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-sam" aria-hidden /> : null}
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} /> : null}
      {label}
    </button>
  );
}
