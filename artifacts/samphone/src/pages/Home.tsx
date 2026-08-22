import Hero from "@/components/Hero";
import HomeNewArrivals from "@/components/HomeNewArrivals";
import HomeServices from "@/components/HomeServices";
import HomeBrands from "@/components/HomeBrands";
import Products from "@/components/Products";
import Deals from "@/components/Deals";
import RecommendedSection from "@/components/RecommendedSection";
import HomeCutoff from "@/components/HomeCutoff";
import Categories from "@/components/Categories";
import AccessoriesBanner from "@/components/AccessoriesBanner";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import Reviews from "@/components/Reviews";
import About from "@/components/About";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeServices />
      <HomeNewArrivals />
      <Categories />
      <RecommendedSection />
      <AccessoriesBanner />
      <Products />
      <Deals />
      <HomeBrands />
      <RecentlyViewedSection />
      <HomeCutoff />
      <Reviews />
      <About />
    </>
  );
}
