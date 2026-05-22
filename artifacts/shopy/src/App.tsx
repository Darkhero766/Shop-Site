import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSubdomainFromHost } from "@/lib/supabase";

import HomePage from "@/pages/HomePage";
import JoinPage from "@/pages/JoinPage";
import LoginPage from "@/pages/LoginPage";
import ShopPage from "@/pages/ShopPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const shopSlug = getSubdomainFromHost();

  // Subdomain routing interceptor
  if (shopSlug && shopSlug !== "www" && shopSlug !== "app") {
    return <ShopPage slug={shopSlug} />;
  }

  // Normal App Routing
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/join" component={JoinPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;