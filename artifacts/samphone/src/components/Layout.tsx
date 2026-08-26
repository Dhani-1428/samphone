import { type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import BackToTopButton from "@/components/BackToTopButton";
import CartSider from "@/components/CartSider";
import BrowseRouteTracker from "@/components/BrowseRouteTracker";
import WholesaleStatusBanner from "@/components/WholesaleStatusBanner";
import { CartProvider } from "@/contexts/CartContext";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <BrowseRouteTracker />
        <Navbar />
        <WholesaleStatusBanner />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartSider />
        <WhatsAppButton />
        <BackToTopButton />
      </div>
    </CartProvider>
  );
}
