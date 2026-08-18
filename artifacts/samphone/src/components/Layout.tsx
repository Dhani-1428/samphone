import { type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupportWidget from "@/components/SupportWidget";
import BrowseRouteTracker from "@/components/BrowseRouteTracker";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8] text-navy">
      <BrowseRouteTracker />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <SupportWidget />
    </div>
  );
}
