import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";

const pool = [productCase, productCharger, productScreen];

/** Build a small gallery for PDP zoom (high-quality placeholders; swap for CDN URLs in production) */
export function buildProductGallery(mainImage: string): string[] {
  const set = new Set<string>([mainImage, ...pool]);
  return Array.from(set);
}

/** 360° viewer: enabled for smartphone parts & flagship new arrivals (demo) */
export function productSupports360View(cartKey: string, productName: string): boolean {
  if (cartKey.startsWith("phones:")) return true;
  if (cartKey.startsWith("new:")) {
    return /iphone|samsung|pixel|oneplus|xiaomi|galaxy/i.test(productName);
  }
  return false;
}
