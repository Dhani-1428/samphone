import { type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { FollowerPointerCard } from "@/components/ui/following-pointer";

const SamphoneCursor = () => (
  <span className="flex items-center gap-1 font-display font-bold tracking-tight text-white text-xs">
    <span>sam</span>
    <span className="opacity-80">phone</span>
  </span>
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <FollowerPointerCard title={<SamphoneCursor />} className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </FollowerPointerCard>
  );
}
