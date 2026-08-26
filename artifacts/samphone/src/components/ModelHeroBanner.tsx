import CatalogImage from "@/components/CatalogImage";

export default function ModelHeroBanner({
  crumbs,
  title,
  description,
  images,
}: {
  crumbs: string[];
  title: string;
  description: string;
  images: string[];
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white px-6 py-8 shadow-sm sm:px-10 md:px-12 md:py-10">
      <div className="relative grid items-center gap-6 md:grid-cols-[1fr_minmax(240px,42%)]">
        <div className="min-w-0">
          <p className="mb-3 text-[13px]">
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5B6B86]">{description}</p>
        </div>

        <div className="relative mx-auto flex h-44 w-full max-w-sm items-center justify-center md:h-56">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[#E8E8E8]/90 md:h-60 md:w-60" aria-hidden />
          <div className="pointer-events-none absolute right-16 top-8 h-28 w-28 rounded-full bg-[#EEF3FA] md:right-20 md:h-40 md:w-40" aria-hidden />
          <div
            className="pointer-events-none absolute -right-2 top-2 h-36 w-24 opacity-[0.45] md:h-44 md:w-28"
            style={{
              backgroundImage: "radial-gradient(#8FA0BC 1.15px, transparent 1.15px)",
              backgroundSize: "9px 9px",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute bottom-6 left-6 h-9 w-9 rounded-full bg-sam md:left-8 md:h-11 md:w-11" aria-hidden />

          {images[0] ? (
            <CatalogImage
              src={images[0]}
              alt=""
              className="relative z-[1] h-36 w-36 object-contain drop-shadow-md md:h-48 md:w-48"
            />
          ) : (
            <div className="relative z-[1] h-36 w-24 rounded-[1.6rem] bg-gradient-to-b from-slate-200 to-slate-400 shadow-md md:h-48 md:w-28" />
          )}
          {images[1] ? (
            <CatalogImage
              src={images[1]}
              alt=""
              className="absolute bottom-2 right-8 z-[2] h-24 w-24 object-contain drop-shadow-lg md:right-10 md:h-32 md:w-32"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
