import Hero from "@/components/Hero";
import HomeServices from "@/components/HomeServices";
import Categories from "@/components/Categories";
import HomeNewArrivals from "@/components/HomeNewArrivals";
import HomeCloudRails from "@/components/HomeCloudRails";
import Products from "@/components/Products";
import RecommendedSection from "@/components/RecommendedSection";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import Reviews from "@/components/Reviews";
import About from "@/components/About";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeServices />
      <Categories />
      <HomeNewArrivals />
      <HomeCloudRails />
      <RecommendedSection />
      <Products />
      <RecentlyViewedSection />
      <Reviews />
      <About />
    </>
  );
}
