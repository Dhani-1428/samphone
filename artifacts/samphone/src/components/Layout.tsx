import { useLayoutEffect, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import BackToTopButton from "@/components/BackToTopButton";
import AddedToCartPopup from "@/components/AddedToCartPopup";
import CartSider from "@/components/CartSider";
import BrowseRouteTracker from "@/components/BrowseRouteTracker";
import WholesaleStatusBanner from "@/components/WholesaleStatusBanner";
import CookieConsent from "@/components/CookieConsent";
import { hideStoreCart } from "@/lib/storefront-preview";

export default function Layout({
  children,
  variant = "store",
}: {
  children: ReactNode;
  variant?: "store" | "admin";
}) {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>("header");
    if (!header) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--site-header-h",
        `${Math.round(header.getBoundingClientRect().height)}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--site-header-h");
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrowseRouteTracker />
      <Navbar />
      {variant === "store" ? <WholesaleStatusBanner /> : null}
      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">{children}</main>
        {variant === "store" && !hideStoreCart() ? <CartSider /> : null}
      </div>
      {variant === "store" ? (
        <>
          <Footer />
          <WhatsAppButton />
          <BackToTopButton />
          {hideStoreCart() ? null : <AddedToCartPopup />}
          <CookieConsent />
        </>
      ) : null}
    </div>
  );
}
