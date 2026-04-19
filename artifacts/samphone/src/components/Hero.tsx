import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { allBrands } from "@/data/brands";

function HomeHeader() {
  const scrollToProducts = () => document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
  const scrollToCategories = () => document.querySelector("#categories")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-36 px-4 md:px-6 w-full left-0 top-0">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium">Lisbon's #1 Tech Boutique</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1] mb-6">
        Your Phone. <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Your Parts.</span> <br />
        Delivered Fast.
      </h1>
      <p className="text-lg md:text-xl text-foreground/75 mb-8 max-w-2xl leading-relaxed">
        Premium accessories and pro-grade repair parts for over{" "}
        <span className="font-semibold text-foreground">700+ device models</span>. Fast delivery across Lisbon and Portugal.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <Button size="lg" className="h-14 px-8 text-base group bg-primary hover:bg-primary/90 text-primary-foreground" onClick={scrollToProducts}>
          <ShoppingBag className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
          Shop Now
        </Button>
        <Button size="lg" variant="outline" className="h-14 px-8 text-base group hover:bg-muted border-border" onClick={scrollToCategories}>
          Browse Categories
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex -space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
              <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Customer" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full border-2 border-background bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">+2k</span>
          </div>
        </div>
        <div className="text-sm text-foreground/80">
          <p className="font-semibold text-foreground">4.9/5 Rating</p>
          <p>from 600+ happy customers</p>
        </div>
      </div>
      <p className="mt-8 text-sm font-medium text-muted-foreground uppercase tracking-widest">
        Scroll to explore brands
      </p>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="bg-background">
      <HeroParallax brands={allBrands} header={<HomeHeader />} />
    </section>
  );
}
