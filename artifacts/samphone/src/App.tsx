import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Accessories from "@/pages/Accessories";
import Smartphones from "@/pages/Smartphones";
import Cards from "@/pages/Cards";
import NewArrivals from "@/pages/NewArrivals";
import MultiBrand from "@/pages/MultiBrand";
import Contact from "@/pages/Contact";
import CategoryPage from "@/pages/CategoryPage";
import Layout from "@/components/Layout";

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
      <Route path="/contact">
        <Layout><Contact /></Layout>
      </Route>
      <Route path="/category/:slug">
        <Layout><CategoryPage /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
