import { Link } from "wouter";
import logo from "@/assets/samphone-logo.png";

export default function BrandLogo({
  className = "h-9 w-auto sm:h-11",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link href="/" className="flex shrink-0 items-center" onClick={onClick} aria-label="samphone">
      <img src={logo} alt="samphone" className={className} />
    </Link>
  );
}
