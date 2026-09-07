import { Link } from "wouter";

/** Same type as the former Read More label: Open Sans, 13px, medium, all caps. */
export const PRODUCT_DESC_TYPE =
  "font-sans text-[13px] font-semibold uppercase leading-5 tracking-[0.08em]";

export default function ProductCardWriting({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link href={href} className="block w-full text-center">
      <h3 className={`${PRODUCT_DESC_TYPE} line-clamp-2 text-brand`}>{title}</h3>
    </Link>
  );
}
