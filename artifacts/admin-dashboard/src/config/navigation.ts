/** Sidebar nav items — Step 8 */
export const adminNav = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "LayoutDashboard" },
  { href: "/products", labelKey: "nav.products", icon: "Package" },
  { href: "/categories", labelKey: "nav.categories", icon: "FolderTree" },
  { href: "/customers", labelKey: "nav.customers", icon: "Users" },
  { href: "/pricing", labelKey: "nav.pricing", icon: "BadgeEuro" },
  { href: "/promotions", labelKey: "nav.promotions", icon: "Percent" },
  { href: "/orders", labelKey: "nav.orders", icon: "ShoppingCart" },
  { href: "/inventory", labelKey: "nav.inventory", icon: "Warehouse" },
  { href: "/settings", labelKey: "nav.settings", icon: "Settings" },
] as const;
