import { Link } from "wouter";
import { useTranslatedText } from "@/hooks/useTranslatedText";

/** Roboto-Medium (family Roboto, PostScript Roboto-Medium). */
export const PRODUCT_DESC_TYPE =
  "product-card-copy text-[13px] uppercase leading-4 tracking-normal text-black sm:text-[14px] sm:leading-[1.15]";

export default function ProductCardWriting({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  const label = useTranslatedText(title);
  return (
    <Link href={href} className="block w-full text-center">
      <h3 className={`${PRODUCT_DESC_TYPE} line-clamp-2`}>{label}</h3>
    </Link>
  );
}
