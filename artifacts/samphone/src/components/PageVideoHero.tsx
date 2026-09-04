interface PageVideoHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Kept for callers; catalog pages use a plain Utopya-style title, not video. */
  videoSrc?: string;
}

export default function PageVideoHero(_props: PageVideoHeroProps) {
  return null;
}
