import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import AdminShell from "@/components/admin/AdminShell";
import { classifyCatalogProduct, suggestedTaxonomyFields } from "@/lib/catalog-taxonomy";
import { readSearchAnalytics } from "@/lib/model-search";

export default function AdminCatalog() {
  const { products, loading } = useProductCatalog();
  const flagged = products
    .map((p) => ({ p, cls: classifyCatalogProduct(p) }))
    .filter((row) => row.cls.issues.length > 0);
  const analytics = typeof window !== "undefined" ? readSearchAnalytics() : [];
  const zero = analytics.filter((e) => e.resultCount === 0);

  return (
    <AdminShell title="Advanced tools">
      <h1 className="font-display text-2xl font-bold text-navy">Catalog taxonomy</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Flags products missing category/subcategory or with invalid Parts vs Accessories tags.
      </p>
      <div className="mt-6 space-y-8">
        {loading ? <p className="text-sm text-muted-foreground">Loading catalog…</p> : null}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-bold">Validation warnings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {flagged.length} of {products.length} loaded products need review. Suggested category/subcategory is shown for
            a catalog migration.
          </p>
          {flagged.length === 0 && !loading ? (
            <p className="mt-4 text-sm">No taxonomy issues in the cached catalog.</p>
          ) : (
            <ul className="mt-4 max-h-[480px] space-y-2 overflow-auto text-sm">
              {flagged.slice(0, 200).map(({ p, cls }) => {
                const suggested = suggestedTaxonomyFields(p);
                return (
                  <li key={p.cloudId || p.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-neutral-700">
                      issues: {cls.issues.join(", ")} · suggested {suggested.category}/{suggested.subcategory} · chip{" "}
                      {cls.typeId}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-bold">Search analytics (this browser)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zero-result queries are listed so aliases and synonyms can be expanded.
          </p>
          {zero.length === 0 ? (
            <p className="mt-4 text-sm">No zero-result searches stored yet.</p>
          ) : (
            <ul className="mt-4 space-y-1 text-sm">
              {zero.slice(-40).reverse().map((e) => (
                <li key={`${e.at}-${e.query}`}>
                  “{e.query}” → model {e.modelId ?? "—"} · type {e.typeId ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
