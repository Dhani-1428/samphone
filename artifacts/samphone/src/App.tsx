import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecentlyViewedProvider } from "@/contexts/RecentlyViewedContext";
import { BrowseBehaviorProvider } from "@/contexts/BrowseBehaviorContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProductCatalogProvider } from "@/contexts/ProductCatalogContext";
import { CustomerPricingProvider } from "@/contexts/CustomerPricingContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Accessories from "@/pages/Accessories";
import Smartphones from "@/pages/Smartphones";
import Cards from "@/pages/Cards";
import NewArrivals from "@/pages/NewArrivals";
import MultiBrand from "@/pages/MultiBrand";
import BrandPage from "@/pages/BrandPage";
import Contact from "@/pages/Contact";
import CategoryPage from "@/pages/CategoryPage";
import ProductPage from "@/pages/ProductPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Account from "@/pages/Account";
import Compare from "@/pages/Compare";
import CartPage from "@/pages/CartPage";
import WishlistPage from "@/pages/WishlistPage";
import TrackOrder from "@/pages/TrackOrder";
import BookRepair from "@/pages/BookRepair";
import TradeIn from "@/pages/TradeIn";
import DeviceDiagnostics from "@/pages/DeviceDiagnostics";
import WooStore from "@/pages/WooStore";
import ModelCatalogPage from "@/pages/ModelCatalogPage";
import AdminPricing from "@/pages/admin/AdminPricing";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout><Home /></Layout>
      </Route>
      <Route path="/accessories">
        <Layout><Accessories /></Layout>
      </Route>
      <Route path="/smartphone">
        <Layout><Smartphones /></Layout>
      </Route>
      <Route path="/phones">
        <Layout><Smartphones /></Layout>
      </Route>
      <Route path="/tablets">
        <Layout><Smartphones /></Layout>
      </Route>
      <Route path="/smartphones">
        <Layout><Smartphones /></Layout>
      </Route>
      <Route path="/cards">
        <Layout><Cards /></Layout>
      </Route>
      <Route path="/new">
        <Layout><NewArrivals /></Layout>
      </Route>
      <Route path="/multi-brand">
        <Layout><MultiBrand /></Layout>
      </Route>
      <Route path="/brand/:slug">
        <Layout><BrandPage /></Layout>
      </Route>
      <Route path="/contact">
        <Layout><Contact /></Layout>
      </Route>
      <Route path="/login">
        <Layout><Login /></Layout>
      </Route>
      <Route path="/register">
        <Layout><Register /></Layout>
      </Route>
      <Route path="/account">
        <Layout><Account /></Layout>
      </Route>
      <Route path="/compare">
        <Layout><Compare /></Layout>
      </Route>
      <Route path="/cart">
        <Layout><CartPage /></Layout>
      </Route>
      <Route path="/wishlist">
        <Layout><WishlistPage /></Layout>
      </Route>
      <Route path="/track">
        <Layout><TrackOrder /></Layout>
      </Route>
      <Route path="/book-repair">
        <Layout><BookRepair /></Layout>
      </Route>
      <Route path="/trade-in">
        <Layout><TradeIn /></Layout>
      </Route>
      <Route path="/diagnostics">
        <Layout><DeviceDiagnostics /></Layout>
      </Route>
      <Route path="/store">
        <Layout><WooStore /></Layout>
      </Route>
      <Route path="/model/:brand/:family/:model">
        <Layout><ModelCatalogPage /></Layout>
      </Route>
      <Route path="/model/:brand/:model">
        <Layout><ModelCatalogPage /></Layout>
      </Route>
      <Route path="/category/:slug">
        <Layout><CategoryPage /></Layout>
      </Route>
      <Route path="/product/cat/:slug/:id">
        <Layout><ProductPage /></Layout>
      </Route>
      <Route path="/product/:scope/:id">
        <Layout><ProductPage /></Layout>
      </Route>
      <Route path="/admin/pricing">
        <AdminPricing />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RecentlyViewedProvider>
            <BrowseBehaviorProvider>
            <CompareProvider>
              <WishlistProvider>
              <CartProvider>
                <QueryClientProvider client={queryClient}>
                  <ProductCatalogProvider>
                    <CustomerPricingProvider>
                    <TooltipProvider>
                      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                        <ScrollToTop />
                        <Router />
                      </WouterRouter>
                      <Toaster />
                    </TooltipProvider>
                    </CustomerPricingProvider>
                  </ProductCatalogProvider>
                </QueryClientProvider>
              </CartProvider>
              </WishlistProvider>
            </CompareProvider>
            </BrowseBehaviorProvider>
          </RecentlyViewedProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
