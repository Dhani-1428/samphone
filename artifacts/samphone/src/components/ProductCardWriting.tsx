import { Link } from "wouter";

/** Roboto Medium on product cards. */
export const PRODUCT_DESC_TYPE =
  "product-card-copy text-[15px] font-medium uppercase leading-5 tracking-[0.08em] text-black";

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
