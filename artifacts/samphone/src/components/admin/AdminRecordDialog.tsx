import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function AdminRecordDialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy/40 p-4 sm:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-record-title"
        className="my-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/[0.08] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-record-title" className="font-display text-xl font-bold text-navy">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-neutral-500 hover:bg-[#F4F6FB]"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
