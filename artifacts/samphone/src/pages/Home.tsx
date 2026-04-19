import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import DeviceSearch from "@/components/DeviceSearch";
import WhyChooseUs from "@/components/WhyChooseUs";
import Reviews from "@/components/Reviews";
import Deals from "@/components/Deals";
import About from "@/components/About";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBadges />
      <Categories />
      <Deals />
      <DeviceSearch />
      <Products />
      <WhyChooseUs />
      <Reviews />
      <About />
    </>
  );
}
