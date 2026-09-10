import { Link } from "wouter";
import { useTranslatedText } from "@/hooks/useTranslatedText";

export const PRODUCT_DESC_TYPE =
  "product-card-copy line-clamp-3 min-h-[3.45rem] whitespace-normal break-words text-[12px] uppercase leading-[1.15rem] tracking-normal text-black sm:min-h-[3.6rem] sm:text-[13px] sm:leading-[1.2rem]";

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
      <h3 className={PRODUCT_DESC_TYPE}>{label}</h3>
    </Link>
  );
}
