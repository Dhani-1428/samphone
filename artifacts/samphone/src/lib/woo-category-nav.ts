import type { WooCategory } from "@/lib/woocommerce";

export interface NavCategoryColumn {
  title: string;
  items: { label: string; slug: string }[];
}

export interface NavBrandGroup {
  brand: { label: string; slug: string };
  items: {
    label: string;
    slug: string;
    href?: string;
    children?: { label: string; slug: string; href?: string }[];
  }[];
}

/** Build mega-menu columns from flat WooCommerce categories (parent → children). */
export function groupWooCategoriesForNav(cats: WooCategory[]): NavCategoryColumn[] {
  if (!cats.length) return [];
  const skip = new Set(["uncategorized", "sem-categoria", "uncategorised"]);

  const roots = cats
    .filter((c) => c.parent === 0 && !skip.has(c.slug.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const columns: NavCategoryColumn[] = [];

  for (const root of roots) {
    const children = cats
      .filter((c) => c.parent === root.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ label: c.name, slug: c.slug }));

    if (children.length > 0) {
      columns.push({ title: root.name, items: children });
    } else if (root.count > 0) {
      columns.push({ title: root.name, items: [{ label: root.name, slug: root.slug }] });
    }
  }

  return columns;
}

/**
 * Build brand-first nav groups:
 * - left side: brands (root categories)
 * - right side: categories under hovered brand
 */
export function buildWooBrandGroups(cats: WooCategory[]): NavBrandGroup[] {
  if (!cats.length) return [];
  const skip = new Set(["uncategorized", "sem-categoria", "uncategorised"]);
  const byId = new Map(cats.map((c) => [c.id, c]));

  const roots = cats
    .filter((c) => c.parent === 0 && !skip.has(c.slug.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups: NavBrandGroup[] = [];

  for (const root of roots) {
    const firstLevel = cats
      .filter((c) => c.parent === root.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const items: { label: string; slug: string }[] = [];
    const seen = new Set<string>();

    for (const child of firstLevel) {
      if (!seen.has(child.slug)) {
        seen.add(child.slug);
        items.push({ label: child.name, slug: child.slug });
      }
      // Include one level deeper so brand hover can reveal richer category sets.
      const secondLevel = cats
        .filter((c) => c.parent === child.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const sub of secondLevel) {
        if (seen.has(sub.slug)) continue;
        seen.add(sub.slug);
        items.push({ label: sub.name, slug: sub.slug });
      }
    }

    if (items.length === 0 && root.count > 0) {
      items.push({ label: root.name, slug: root.slug });
    }
    if (items.length > 0) {
      groups.push({
        brand: { label: root.name, slug: root.slug },
        items,
      });
    }
  }

  return groups;
}
