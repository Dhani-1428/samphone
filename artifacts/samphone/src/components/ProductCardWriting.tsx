import { Link } from "wouter";

/** Same type as the former Read More label: Open Sans, 15px, medium, all caps. */
export const PRODUCT_DESC_TYPE =
  "font-sans text-[15px] font-medium uppercase leading-5 tracking-[0.08em] text-black";

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
