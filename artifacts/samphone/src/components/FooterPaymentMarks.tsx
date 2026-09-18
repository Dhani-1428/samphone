import { FaCcApplePay, FaCcVisa } from "react-icons/fa";

function Badge({
  title,
  children,
  className = "bg-white",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-8 min-w-[3.15rem] items-center justify-center rounded-md px-1.5 ${className}`}
    >
      {children}
    </span>
  );
}
function KlarnaMark() {
  return (
    <svg viewBox="0 0 72 18" className="h-[13px] w-[3.25rem]" aria-hidden>
      <text
        x="0"
        y="15"
        fill="#0A0B09"
        fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="-0.4"
      >
        Klarna
      </text>
    </svg>
  );
}

/** MB WAY lockup in brand red. */
function MbWayMark() {
  return (
    <span className="flex items-baseline gap-[0.12rem] font-sans text-[11px] font-extrabold leading-none tracking-tight text-[#E30613]">
      <span>MB</span>
      <span className="tracking-[0.04em]">WAY</span>
    </span>
  );
}

/** Google's four-color G + Pay. */
function GooglePayMark() {
  return (
    <svg viewBox="0 0 86 24" className="h-5 w-[5.2rem]" aria-hidden>
      <g transform="translate(1 2) scale(0.42)">
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </g>
      <text
        x="26"
        y="16.8"
        fill="#3C4043"
        fontFamily="Product Sans, Google Sans, Arial, sans-serif"
        fontWeight="500"
        fontSize="13"
      >
        Pay
      </text>
    </svg>
  );
}

export default function FooterPaymentMarks({ label }: { label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 text-white md:justify-end">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">{label}</span>
      <FaCcVisa className="h-8 w-11 text-[#F7A51D]" title="Visa" />
      <Badge title="Klarna" className="bg-[#FFB3C7]">
        <KlarnaMark />
      </Badge>
      <Badge title="MB WAY">
        <MbWayMark />
      </Badge>
      <Badge title="Google Pay">
        <GooglePayMark />
      </Badge>
      <FaCcApplePay className="h-8 w-11 text-white" title="Apple Pay" />
    </div>
  );
}
