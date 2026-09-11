import { Suspense } from "react";
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
import SearchPage from "@/pages/SearchPage";
import Home from "@/pages/Home";
import Accessories from "@/pages/Accessories";
import Smartphones from "@/pages/Smartphones";
import Cards from "@/pages/Cards";
import Tools from "@/pages/Tools";
import NewArrivals from "@/pages/NewArrivals";
import MultiBrand from "@/pages/MultiBrand";
import BrandPage from "@/pages/BrandPage";
import Contact from "@/pages/Contact";
import AppFeatures from "@/pages/AppFeatures";
import CategoryPage from "@/pages/CategoryPage";
import ProductPage from "@/pages/ProductPage";
import Login from "@/pages/Login";
import AuthContinue from "@/pages/AuthContinue";
import SsoCallback from "@/pages/SsoCallback";
import Register from "@/pages/Register";
import RegisterBusiness from "@/pages/RegisterBusiness";
import Account from "@/pages/Account";
import Compare from "@/pages/Compare";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import WishlistPage from "@/pages/WishlistPage";
import TrackOrder from "@/pages/TrackOrder";
import BookRepair from "@/pages/BookRepair";
import TradeIn from "@/pages/TradeIn";
import DeviceDiagnostics from "@/pages/DeviceDiagnostics";
import WooStore from "@/pages/WooStore";
import ModelCatalogPage from "@/pages/ModelCatalogPage";
import ShopGroupPage from "@/pages/ShopGroupPage";
import AdminPricing from "@/pages/admin/AdminPricing";
import AdminGate from "@/components/AdminGate";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "@/config/samphone";
import ClerkCloudBridge from "@/components/ClerkCloudBridge";
import ProfileLanguageSync from "@/components/ProfileLanguageSync";
import AdminWholesale from "@/pages/admin/AdminWholesale";
import AdminCatalog from "@/pages/admin/AdminCatalog";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import WholesalePage from "@/pages/WholesalePage";
import FaqPage from "@/pages/FaqPage";
import ScrollToTop from "@/components/ScrollToTop";
import { isClerkEnabled } from "@/lib/clerk-runtime";
import SiteLockGate from "@/components/SiteLockGate";
import ScreenshotGuard from "@/components/ScreenshotGuard";
import AppErrorBoundary from "@/components/AppErrorBoundary";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/search">
        <Layout><SearchPage /></Layout>
      </Route>
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
      <Route path="/tools">
        <Layout><Tools /></Layout>
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
      <Route path="/faq">
        <Layout><FaqPage /></Layout>
      </Route>
      <Route path="/b2b">
        <Layout><WholesalePage /></Layout>
      </Route>
      <Route path="/wholesale">
        <Layout><WholesalePage /></Layout>
      </Route>
      <Route path="/terms-and-conditions">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/cookie-policy">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/cookies">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/warranty">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/legal-information">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/legal">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/complaints">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/adr">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/b2b-terms">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/returns">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/terms-conditions">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/terms">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/privacy-policy">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/privacy-policy-and-data-protection">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/privacy">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/refund-return-policy">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/refunds">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/shipping-policy">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/shipping">
        <Layout><LegalPage /></Layout>
      </Route>
      <Route path="/app">
        <Layout><AppFeatures /></Layout>
      </Route>
      <Route path="/login">
        <Layout><Login /></Layout>
      </Route>
      <Route path="/auth/continue">
        <Layout><AuthContinue /></Layout>
      </Route>
      <Route path="/sso-callback">
        <Layout><SsoCallback /></Layout>
      </Route>
      <Route path="/register/business">
        <Layout><RegisterBusiness /></Layout>
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
      <Route path="/checkout">
        <Layout><CheckoutPage /></Layout>
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
      <Route path="/group/:group">
        <Layout><ShopGroupPage /></Layout>
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
        <AdminGate>
          <AdminPricing />
        </AdminGate>
      </Route>
      <Route path="/admin/wholesale">
        <AdminGate>
          <AdminWholesale />
        </AdminGate>
      </Route>
      <Route path="/admin/catalog">
        <AdminGate>
          <AdminCatalog />
        </AdminGate>
      </Route>
      <Route path="/admin">
        <AdminGate>
          <AdminWholesale />
        </AdminGate>
      </Route>
      <Route>
        <Layout><NotFound /></Layout>
      </Route>
    </Switch>
  );
}

function AppShell({ clerk }: { clerk: boolean }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          {clerk ? <ClerkCloudBridge /> : null}
          <ProfileLanguageSync />
          <ScreenshotGuard>
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
          </ScreenshotGuard>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function App() {
  const clerk = isClerkEnabled();
  const tree = clerk ? (
    <Suspense fallback={null}>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        afterSignInUrl="/auth/continue"
        afterSignUpUrl="/auth/continue"
        allowedRedirectOrigins={[
          "https://www.samphone.eu",
          "https://samphone.eu",
          "https://www.samphone.pt",
          "https://samphone.pt",
          "https://samphone.cloud",
          "https://www.samphone.cloud",
        ]}
      >
        <AppShell clerk />
      </ClerkProvider>
    </Suspense>
  ) : (
    <AppShell clerk={false} />
  );
  return (
    <SiteLockGate>
      <AppErrorBoundary fallback={<AppShell clerk={false} />}>{tree}</AppErrorBoundary>
    </SiteLockGate>
  );
}

export default App;
