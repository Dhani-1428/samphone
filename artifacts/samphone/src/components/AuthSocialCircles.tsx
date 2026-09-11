import { Smartphone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const circleBtn =
  "flex h-12 w-12 items-center justify-center rounded-full border border-black/[0.12] bg-white shadow-sm transition hover:border-black/25 hover:bg-neutral-50 disabled:opacity-50";

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l2.85-2.22.81-.53z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 12.84c-.02-2.14 1.75-3.17 1.83-3.22-1-1.46-2.56-1.66-3.11-1.68-1.32-.13-2.58.78-3.25.78-.67 0-1.71-.76-2.81-.74-1.45.02-2.78.84-3.52 2.14-1.5 2.6-.38 6.45 1.08 8.56.71 1.03 1.56 2.18 2.67 2.14 1.07-.04 1.48-.69 2.77-.69 1.29 0 1.66.69 2.8.67 1.16-.02 1.89-1.05 2.6-2.09.82-1.2 1.16-2.36 1.18-2.42-.03-.01-2.26-.87-2.29-3.45zm-2.15-6.32c.59-.71.98-1.7.87-2.69-.84.03-1.86.56-2.47 1.27-.54.62-.1.02-2.15 1.7-.1 1.02.82 1.97 1.66 2.42.81.47 1.78.41 2.09.3z"
      />
    </svg>
  );
}

export function AuthSocialCircles({
  onGoogle,
  onApple,
  onPhone,
  disabled,
}: {
  onGoogle: () => void;
  onApple: () => void;
  onPhone: () => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-center gap-4">
      <button type="button" className={circleBtn} disabled={disabled} onClick={onGoogle} aria-label={t("reg_continue_google")}>
        <GoogleMark />
      </button>
      <button type="button" className={circleBtn} disabled={disabled} onClick={onApple} aria-label={t("reg_continue_apple")}>
        <AppleMark />
      </button>
      <button type="button" className={circleBtn} disabled={disabled} onClick={onPhone} aria-label={t("reg_continue_mobile")}>
        <Smartphone className="h-5 w-5 text-[#111]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
