import type { ProductCardProps } from "@/components/ProductCard";
import { allSlugs } from "@/data/categories";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

export interface CatalogProduct extends ProductCardProps {
  cartKey: string;
}

const imgPool = [productCase, productCharger, productScreen];

export const HOME_PRODUCTS: CatalogProduct[] = [
  { cartKey: "home:1", id: 1, name: "iPhone 15 Pro Silicone Case", subtitle: "Apple", price: 14.99, oldPrice: 24.99, rating: 4.9, reviews: 312, img: productCase, badge: "Bestseller" },
  { cartKey: "home:2", id: 2, name: "USB-C 65W Fast Charger", subtitle: "Universal", price: 19.99, oldPrice: null, rating: 4.8, reviews: 187, img: productCharger, badge: "New" },
  { cartKey: "home:3", id: 3, name: "Samsung S24 OLED Screen", subtitle: "Samsung", price: 49.99, oldPrice: 79.99, rating: 4.7, reviews: 95, img: productScreen, badge: "Sale" },
  { cartKey: "home:4", id: 4, name: "iPhone 14 Battery Pack", subtitle: "Apple", price: 29.99, oldPrice: 44.99, rating: 4.8, reviews: 203, img: productCase, badge: "Sale" },
  { cartKey: "home:5", id: 5, name: "Xiaomi 13 Tempered Glass", subtitle: "Xiaomi", price: 7.99, oldPrice: null, rating: 4.9, reviews: 156, img: productCharger, badge: null },
  { cartKey: "home:6", id: 6, name: "Bluetooth Earphones Pro", subtitle: "Generic", price: 24.99, oldPrice: 39.99, rating: 4.6, reviews: 88, img: productScreen, badge: "Hot" },
  { cartKey: "home:7", id: 7, name: "Samsung Galaxy A54 Screen", subtitle: "Samsung", price: 39.99, oldPrice: null, rating: 4.7, reviews: 74, img: productCase, badge: null },
  { cartKey: "home:8", id: 8, name: "1m Braided USB-C Cable", subtitle: "Universal", price: 5.99, oldPrice: 9.99, rating: 4.8, reviews: 421, img: productCharger, badge: "Bestseller" },
];

export const PHONE_PARTS: CatalogProduct[] = [
  { cartKey: "phones:1", id: 1, name: "iPhone 15 Pro OLED Display", subtitle: "Apple · Screen", price: 89.99, oldPrice: null, rating: 4.9, reviews: 67, img: productScreen, badge: null },
  { cartKey: "phones:2", id: 2, name: "Samsung S24 Ultra Screen Assembly", subtitle: "Samsung · Screen", price: 79.99, oldPrice: null, rating: 4.8, reviews: 43, img: productScreen, badge: null },
  { cartKey: "phones:3", id: 3, name: "iPhone 14 Battery 3279mAh", subtitle: "Apple · Battery", price: 28.99, oldPrice: null, rating: 4.8, reviews: 201, img: productCase, badge: "Bestseller" },
  { cartKey: "phones:4", id: 4, name: "Xiaomi 13 Charging Port", subtitle: "Xiaomi · Port", price: 14.99, oldPrice: null, rating: 4.6, reviews: 88, img: productCharger, badge: null },
  { cartKey: "phones:5", id: 5, name: "Samsung A54 Back Cover", subtitle: "Samsung · Housing", price: 19.99, oldPrice: null, rating: 4.7, reviews: 112, img: productCase, badge: null },
  { cartKey: "phones:6", id: 6, name: "iPhone 13 Front Camera Module", subtitle: "Apple · Camera", price: 34.99, oldPrice: null, rating: 4.7, reviews: 56, img: productScreen, badge: "New" },
  { cartKey: "phones:7", id: 7, name: "Huawei P60 Battery", subtitle: "Huawei · Battery", price: 24.99, oldPrice: null, rating: 4.6, reviews: 74, img: productCase, badge: null },
  { cartKey: "phones:8", id: 8, name: "OnePlus 12 USB-C Port Flex", subtitle: "OnePlus · Port", price: 12.99, oldPrice: null, rating: 4.5, reviews: 39, img: productCharger, badge: null },
];

export const ACCESSORIES_PRODUCTS: CatalogProduct[] = [
  { cartKey: "acc:1", id: 1, name: "Full Glue Tempered Glass iPhone 15", subtitle: "Screen Protection", price: 6.99, oldPrice: null, rating: 4.9, reviews: 234, img: productScreen, badge: "Bestseller" },
  { cartKey: "acc:2", id: 2, name: "Privacy Glass Samsung S24", subtitle: "Screen Protection", price: 8.99, oldPrice: null, rating: 4.7, reviews: 112, img: productScreen, badge: null },
  { cartKey: "acc:3", id: 3, name: "Silicon Soft Jelly Case iPhone 14", subtitle: "Cases & Covers", price: 9.99, oldPrice: null, rating: 4.8, reviews: 187, img: productCase, badge: "Hot" },
  { cartKey: "acc:4", id: 4, name: "Antishock Cover Xiaomi 13", subtitle: "Cases & Covers", price: 11.99, oldPrice: null, rating: 4.6, reviews: 98, img: productCase, badge: null },
  { cartKey: "acc:5", id: 5, name: "Magsafe Case iPhone 15 Pro", subtitle: "Cases & Covers", price: 19.99, oldPrice: 29.99, rating: 4.9, reviews: 321, img: productCase, badge: "Sale" },
  { cartKey: "acc:6", id: 6, name: "Type-C 65W Fast Charger", subtitle: "Chargers", price: 19.99, oldPrice: null, rating: 4.8, reviews: 204, img: productCharger, badge: "New" },
  { cartKey: "acc:7", id: 7, name: "Wireless Charger 15W Pad", subtitle: "Chargers", price: 24.99, oldPrice: 34.99, rating: 4.7, reviews: 156, img: productCharger, badge: "Sale" },
  { cartKey: "acc:8", id: 8, name: "Lightning Cable Braided 1m", subtitle: "Cables", price: 7.99, oldPrice: null, rating: 4.8, reviews: 412, img: productCharger, badge: "Bestseller" },
  { cartKey: "acc:9", id: 9, name: "Type-C to Type-C Cable 2m", subtitle: "Cables", price: 8.99, oldPrice: null, rating: 4.7, reviews: 178, img: productCharger, badge: null },
  { cartKey: "acc:10", id: 10, name: "Wireless Earphones Pro", subtitle: "Audio", price: 29.99, oldPrice: 44.99, rating: 4.6, reviews: 89, img: productScreen, badge: "Sale" },
  { cartKey: "acc:11", id: 11, name: "Hoco E67 Neck Earphone", subtitle: "Audio", price: 14.99, oldPrice: null, rating: 4.5, reviews: 67, img: productScreen, badge: null },
  { cartKey: "acc:12", id: 12, name: "Hoco Power Bank 10000mAh", subtitle: "Hoco Accessories", price: 34.99, oldPrice: null, rating: 4.8, reviews: 143, img: productCharger, badge: "New" },
];

export const CARDS_PRODUCTS: CatalogProduct[] = [
  { cartKey: "cards:1", id: 1, name: "Samsung MicroSD 128GB Class 10", subtitle: "Samsung · 100MB/s", price: 14.99, oldPrice: 24.99, rating: 4.9, reviews: 312, img: productCharger, badge: "Sale" },
  { cartKey: "cards:2", id: 2, name: "SanDisk Ultra 256GB MicroSD", subtitle: "SanDisk · 120MB/s", price: 24.99, oldPrice: null, rating: 4.8, reviews: 201, img: productCase, badge: null },
  { cartKey: "cards:3", id: 3, name: "Kingston Canvas Select 64GB", subtitle: "Kingston · 80MB/s", price: 9.99, oldPrice: 14.99, rating: 4.7, reviews: 178, img: productScreen, badge: "Sale" },
  { cartKey: "cards:4", id: 4, name: "Lexar 32GB SD Card UHS-I", subtitle: "Lexar · 95MB/s", price: 11.99, oldPrice: null, rating: 4.6, reviews: 89, img: productCharger, badge: null },
  { cartKey: "cards:5", id: 5, name: "SIM Tray Adapter Set", subtitle: "Generic · Universal", price: 3.99, oldPrice: 6.99, rating: 4.8, reviews: 423, img: productCase, badge: "Bestseller" },
  { cartKey: "cards:6", id: 6, name: "Samsung PRO Plus 512GB MicroSD", subtitle: "Samsung · 160MB/s", price: 49.99, oldPrice: 69.99, rating: 4.9, reviews: 145, img: productScreen, badge: "Sale" },
];

export const NEW_ARRIVALS_PRODUCTS: (CatalogProduct & { daysAgo: number })[] = [
  { cartKey: "new:1", id: 1, name: "iPhone 16 Pro Titanium Case", subtitle: "Apple · Cases", price: 22.99, oldPrice: null, rating: 4.9, reviews: 12, img: productCase, badge: "New", daysAgo: 1 },
  { cartKey: "new:2", id: 2, name: "Samsung S25 Tempered Glass", subtitle: "Samsung · Protection", price: 8.99, oldPrice: null, rating: 4.8, reviews: 8, img: productScreen, badge: "New", daysAgo: 2 },
  { cartKey: "new:3", id: 3, name: "140W GaN Charger (Triple Port)", subtitle: "Generic · Chargers", price: 39.99, oldPrice: null, rating: 4.7, reviews: 5, img: productCharger, badge: "New", daysAgo: 2 },
  { cartKey: "new:4", id: 4, name: "Xiaomi 15 Battery Pack", subtitle: "Xiaomi · Parts", price: 32.99, oldPrice: null, rating: 4.8, reviews: 14, img: productCase, badge: "New", daysAgo: 3 },
  { cartKey: "new:5", id: 5, name: "Pixel 9 Pro Screen Assembly", subtitle: "Google · Parts", price: 94.99, oldPrice: null, rating: 4.9, reviews: 7, img: productScreen, badge: "New", daysAgo: 4 },
  { cartKey: "new:6", id: 6, name: "MagSafe Wallet Case — iPhone 16", subtitle: "Apple · Cases", price: 27.99, oldPrice: null, rating: 4.8, reviews: 21, img: productCase, badge: "New", daysAgo: 5 },
  { cartKey: "new:7", id: 7, name: "USB4 240W Cable 2m", subtitle: "Generic · Cables", price: 16.99, oldPrice: null, rating: 4.7, reviews: 9, img: productCharger, badge: "New", daysAgo: 6 },
  { cartKey: "new:8", id: 8, name: "OnePlus 13 Rear Camera Module", subtitle: "OnePlus · Parts", price: 42.99, oldPrice: null, rating: 4.6, reviews: 6, img: productScreen, badge: "New", daysAgo: 7 },
];

export const MULTI_BRAND_FEATURED: (CatalogProduct & { brand: string })[] = [
  { cartKey: "multi:1", id: 1, name: "Hoco Z52 Noise Cancelling Earphones", subtitle: "Hoco", price: 21.99, oldPrice: 34.99, rating: 4.7, reviews: 134, img: productScreen, badge: "Bestseller", brand: "Hoco" },
  { cartKey: "multi:2", id: 2, name: "Baseus 100W USB-C Hub 7-in-1", subtitle: "Baseus", price: 44.99, oldPrice: null, rating: 4.8, reviews: 87, img: productCharger, badge: "New", brand: "Baseus" },
  { cartKey: "multi:3", id: 3, name: "Anker 733 Power Bank 10000mAh", subtitle: "Anker", price: 59.99, oldPrice: 79.99, rating: 4.9, reviews: 201, img: productCase, badge: "Sale", brand: "Anker" },
  { cartKey: "multi:4", id: 4, name: "Ugreen 2m USB-C Braided Cable", subtitle: "Ugreen", price: 12.99, oldPrice: null, rating: 4.8, reviews: 312, img: productCharger, badge: null, brand: "Ugreen" },
  { cartKey: "multi:5", id: 5, name: "Hoco C96A 20W PD Charger", subtitle: "Hoco", price: 14.99, oldPrice: 22.99, rating: 4.7, reviews: 178, img: productCharger, badge: "Hot", brand: "Hoco" },
  { cartKey: "multi:6", id: 6, name: "Joyroom S-UL012A5 iPhone Cable 3m", subtitle: "Joyroom", price: 9.99, oldPrice: 14.99, rating: 4.6, reviews: 98, img: productCase, badge: "Sale", brand: "Joyroom" },
];

export const DEAL_PRODUCTS: CatalogProduct[] = [
  { cartKey: "deal:1", id: 1, name: "iPhone 14 Screen Replacement", subtitle: "Flash deal", price: 59.99, oldPrice: 89.99, rating: 4.8, reviews: 156, img: productScreen, badge: "Sale" },
  { cartKey: "deal:2", id: 2, name: "Premium Phone Case Bundle (3-Pack)", subtitle: "Flash deal", price: 24.99, oldPrice: 39.99, rating: 4.7, reviews: 89, img: productCase, badge: "Sale" },
  { cartKey: "deal:3", id: 3, name: "65W GaN Charger + 2m Cable Kit", subtitle: "Flash deal", price: 27.99, oldPrice: 44.99, rating: 4.9, reviews: 212, img: productCharger, badge: "Sale" },
];

function generateCategoryProducts(slug: string, label: string): CatalogProduct[] {
  const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => {
    const id = i + 1;
    const cartKey = `cat:${slug}:${id}`;
    return {
      cartKey,
      id,
      name: `${label} — ${["Model A", "Pro Edition", "Ultra Slim", "Heavy Duty", "Standard", "Premium", "Compact", "Deluxe"][i]}`,
      subtitle: label,
      price: parseFloat((((seed + i * 7) % 80) + 5.99).toFixed(2)),
      oldPrice: i % 3 === 0 ? parseFloat((((seed + i * 7) % 80) + 15.99).toFixed(2)) : null,
      rating: parseFloat((4.5 + ((i * 0.1) % 0.5)).toFixed(1)),
      reviews: ((seed + i * 13) % 300) + 10,
      img: imgPool[(seed + i) % 3],
      badge: i === 0 ? "Bestseller" : i === 2 ? "New" : i === 5 ? "Sale" : null,
    };
  });
}

export function getCategoryProducts(slug: string): CatalogProduct[] {
  const meta = allSlugs[slug];
  const label = meta?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return generateCategoryProducts(slug, label);
}

const SCOPE_MAP: Record<string, readonly CatalogProduct[] | undefined> = {
  home: HOME_PRODUCTS,
  phones: PHONE_PARTS,
  acc: ACCESSORIES_PRODUCTS,
  cards: CARDS_PRODUCTS,
  new: NEW_ARRIVALS_PRODUCTS,
  multi: MULTI_BRAND_FEATURED,
  deal: DEAL_PRODUCTS,
};

export function hrefForCartKey(cartKey: string): string {
  if (cartKey.startsWith("cat:")) {
    const rest = cartKey.slice(4);
    const lastColon = rest.lastIndexOf(":");
    const slug = rest.slice(0, lastColon);
    const id = rest.slice(lastColon + 1);
    return `/product/cat/${slug}/${id}`;
  }
  const [scope, id] = cartKey.split(":");
  return `/product/${scope}/${id}`;
}

export function resolveCatalogProduct(cartKey: string): CatalogProduct | null {
  if (cartKey.startsWith("cat:")) {
    const rest = cartKey.slice(4);
    const lastColon = rest.lastIndexOf(":");
    const slug = rest.slice(0, lastColon);
    const id = parseInt(rest.slice(lastColon + 1), 10);
    if (!slug || Number.isNaN(id)) return null;
    const list = getCategoryProducts(slug);
    return list.find((p) => p.id === id) ?? null;
  }
  const [scope, idStr] = cartKey.split(":");
  const id = parseInt(idStr, 10);
  const list = SCOPE_MAP[scope];
  if (!list || Number.isNaN(id)) return null;
  return list.find((p) => p.id === id) ?? null;
}

export function getCatalogProductByRoute(
  scope: string,
  idStr: string,
  catSlug?: string,
): CatalogProduct | null {
  if (scope === "cat" && catSlug) {
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return null;
    const list = getCategoryProducts(catSlug);
    return list.find((p) => p.id === id) ?? null;
  }
  return resolveCatalogProduct(`${scope}:${idStr}`);
}
