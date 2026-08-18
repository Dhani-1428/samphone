import Hero from "@/components/Hero";
import HomeNewArrivals from "@/components/HomeNewArrivals";
import Products from "@/components/Products";
import Deals from "@/components/Deals";
import RecommendedSection from "@/components/RecommendedSection";
import HomeCutoff from "@/components/HomeCutoff";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeNewArrivals />
      <RecommendedSection />
      <Products />
      <Deals />
      <HomeCutoff />
    </>
  );
}
