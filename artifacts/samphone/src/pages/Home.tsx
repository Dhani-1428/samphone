import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import DeviceSearch from "@/components/DeviceSearch";
import WhyChooseUs from "@/components/WhyChooseUs";
import Reviews from "@/components/Reviews";
import Deals from "@/components/Deals";
import About from "@/components/About";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustBadges />
        <Categories />
        <Deals />
        <DeviceSearch />
        <Products />
        <WhyChooseUs />
        <Reviews />
        <About />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
