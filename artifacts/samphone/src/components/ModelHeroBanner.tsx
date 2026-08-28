export default function ModelHeroBanner({
  crumbs,
  title,
  description,
}: {
  crumbs: string[];
  title: string;
  description: string;
  images?: string[];
}) {
  return (
    <section className="mb-2">
      <p className="mb-2 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${c}-${i}`}>
              {i > 0 ? <span className="mx-1.5 text-[#C48A4A]">›</span> : null}
              <span className={last ? "text-[#333333]" : "text-[#C48A4A]"}>{c}</span>
            </span>
          );
        })}
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#5B6B86]">{description}</p> : null}
    </section>
  );
}
