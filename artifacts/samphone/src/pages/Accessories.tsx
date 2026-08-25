import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Categories from "@/components/Categories";
import PageVideoHero from "@/components/PageVideoHero";
import { useLang } from "@/contexts/LanguageContext";

export default function Accessories() {
  const { t } = useLang();
  return (
    <div>
      <PageVideoHero
        eyebrow="Home / Accessories"
        title={t("home_accessories_title")}
        description={t("home_accessories_sub")}
      />
      <div className="mx-auto w-full max-w-[1600px] px-5 pt-6 sm:px-8 md:px-10 lg:px-14">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>
      </div>
      <Categories />
    </div>
  );
}
