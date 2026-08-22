import { type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupportWidget from "@/components/SupportWidget";
import CartSider from "@/components/CartSider";
import BrowseRouteTracker from "@/components/BrowseRouteTracker";
import { CartProvider } from "@/contexts/CartContext";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-[#F4F6F8] text-navy">
        <BrowseRouteTracker />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartSider />
        <SupportWidget />
      </div>
    </CartProvider>
  );
}
