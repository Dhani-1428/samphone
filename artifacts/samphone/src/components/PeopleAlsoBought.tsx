import { useLang } from "@/contexts/LanguageContext";
import { getPeopleAlsoBoughtProducts } from "@/data/people-also-bought";
import ProductCard from "@/components/ProductCard";

export default function PeopleAlsoBought({ cartKey }: { cartKey: string }) {
  const { t } = useLang();
  const products = getPeopleAlsoBoughtProducts(cartKey, 4);
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6">{t("people_also_bought_title")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => (
          <ProductCard key={p.cartKey} {...p} testPrefix="also" />
        ))}
      </div>
    </section>
  );
}
