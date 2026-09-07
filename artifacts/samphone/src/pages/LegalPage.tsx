import { Link, useRoute } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import { legalPageByPath, type LegalBlock } from "@/data/legal-pages";
import NotFound from "@/pages/not-found";

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "h") {
    return <h2 className="mt-8 text-lg font-display font-bold text-foreground">{block.text}</h2>;
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
}

export default function LegalPage() {
  const [match, params] = useRoute("/:slug");
  const { lang } = useLang();
  const path = match && params?.slug ? `/${params.slug}` : "";
  const doc = legalPageByPath(path);
  if (!doc) return <NotFound />;

  const title = lang === "pt" ? doc.titlePt : doc.titleEn;
  const eyebrow = lang === "pt" ? doc.eyebrowPt : doc.eyebrowEn;
  const description = lang === "pt" ? doc.descriptionPt : doc.descriptionEn;

  return (
    <div className="bg-muted/20 min-h-[70vh]">
      <div className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <article className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8">
        {doc.blocks.map((block, i) => (
          <Block key={`${block.type}-${i}`} block={block} />
        ))}
        <p className="mt-10 text-sm">
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            {lang === "pt" ? "Contacte-nos" : "Contact us"}
          </Link>
        </p>
      </article>
    </div>
  );
}
