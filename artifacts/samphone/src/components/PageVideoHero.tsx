interface PageVideoHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Kept for callers; catalog pages use a plain Utopya-style title, not video. */
  videoSrc?: string;
}

export default function PageVideoHero({ eyebrow, title, description }: PageVideoHeroProps) {
  return (
    <section className="border-b border-black/[0.06] bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <p className="mb-2 text-xs text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy md:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  );
}
