import Hero from "@/components/Hero";
import HomeNewArrivals from "@/components/HomeNewArrivals";
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import DeviceSearch from "@/components/DeviceSearch";
import WhyChooseUs from "@/components/WhyChooseUs";
import Reviews from "@/components/Reviews";
import Deals from "@/components/Deals";
import About from "@/components/About";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import RecommendedSection from "@/components/RecommendedSection";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeNewArrivals />
      <TrustBadges />
      <Categories />
      <Deals />
      <DeviceSearch />
      <Products />
      <RecommendedSection />
      <RecentlyViewedSection />
      <WhyChooseUs />
      <Reviews />
      <About />
    </>
  );
}
