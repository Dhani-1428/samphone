import { Link } from "wouter";

export default function ProductCardWriting({
  href,
  title,
  description,
  readMoreLabel,
}: {
  href: string;
  title: string;
  description?: string;
  readMoreLabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Link href={href} className="block w-full">
        <h3 className="product-card-copy line-clamp-2 text-[15px] font-medium leading-5 tracking-[0.04em] text-brand uppercase sm:text-base">
          {title}
        </h3>
        {description ? (
          <p className="product-card-copy mt-1 line-clamp-1 text-[13px] font-medium leading-5 tracking-[0.04em] text-brand/60 uppercase">
            {description}
          </p>
        ) : null}
      </Link>
      <Link
        href={href}
        className="mt-3 inline-flex items-center justify-center bg-brand px-7 py-2 text-[13px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-dark"
      >
        {readMoreLabel}
      </Link>
    </div>
  );
}
