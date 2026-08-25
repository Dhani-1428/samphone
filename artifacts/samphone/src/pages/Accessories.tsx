import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Categories from "@/components/Categories";
import ModelHeroBanner from "@/components/ModelHeroBanner";
import { CatalogBackLink, CatalogSectionHeading } from "@/components/CatalogPageChrome";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudProductList, firstCatalogImage } from "@/lib/samphone-cloud";

export default function Accessories() {
  const { t } = useLang();
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      fetchCloudProductList({ category_group: "Chargers" }, 6),
      fetchCloudProductList({ category_group: "Cables" }, 6),
    ]).then(([chargers, cables]) => {
      if (!alive) return;
      const urls = [firstCatalogImage(chargers.items), firstCatalogImage(cables.items)].filter(
        (src): src is string => Boolean(src),
      );
      setImages(urls);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <ModelHeroBanner
          crumbs={[t("accessory_breadcrumb_home"), t("home_accessories_title")]}
          title={t("home_accessories_title")}
          description={t("home_accessories_sub")}
          images={images}
        />
        <CatalogBackLink />
        <CatalogSectionHeading icon={Sparkles} title={t("accessory_groups_title")} hint={t("accessory_groups_hint")} />
        <Categories showHeading={false} cardStyle="catalog" embedded />
      </div>
    </div>
  );
}
