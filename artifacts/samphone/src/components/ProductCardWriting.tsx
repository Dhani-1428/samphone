import { Link } from "wouter";

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
  return (
    <Link href={href} className="block w-full text-center">
      <h3 className={`${PRODUCT_DESC_TYPE} line-clamp-2`}>{title}</h3>
    </Link>
  );
}
