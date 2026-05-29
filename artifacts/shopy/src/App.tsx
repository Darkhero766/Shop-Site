import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSubdomainFromHost } from "@/lib/supabase";
import { AuthProvider } from "@/lib/auth-context";
import { BuyerAuthProvider } from "@/lib/buyer-auth-context";

import HomePage from "@/pages/HomePage";
import JoinPage from "@/pages/JoinPage";
import LoginPage from "@/pages/LoginPage";
import ShopPage from "@/pages/ShopPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";
import CheckoutFlow from "@/pages/CheckoutFlow";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const shopSlug = getSubdomainFromHost();

  // Subdomain routing: handle product checkout routes first, then fall through to ShopPage
  if (shopSlug && shopSlug !== "www" && shopSlug !== "app") {
    return (
      <Switch>
        <Route path="/s/:shopSlug/product/:productId">
          {(params) => <CheckoutFlow shopSlug={params.shopSlug!} productId={params.productId!} />}
        </Route>
        <Route>
          <ShopPage slug={shopSlug} />
        </Route>
      </Switch>
    );
  }

  // Normal App Routing
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/s/:shopSlug/product/:productId">
        {(params) => <CheckoutFlow shopSlug={params.shopSlug!} productId={params.productId!} />}
      </Route>
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
      <AuthProvider>
        <BuyerAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </TooltipProvider>
        </BuyerAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
