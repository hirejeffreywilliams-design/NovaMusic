import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import DJConsole from "@/pages/dj-console";
import PartyMode from "@/pages/party-mode";
import AIDJPage from "@/pages/ai-dj";
import CrowdPage from "@/pages/crowd-page";
import SetlistPage from "@/pages/setlist-page";
import Pricing from "@/pages/pricing";
import AdminDashboard from "@/pages/admin";
import CompliancePage from "@/pages/compliance";
import TermsPage from "@/pages/terms";
import SignupPage from "@/pages/signup";
import ArtistDashboard from "@/pages/artist-dashboard";
import MarketplacePage from "@/pages/marketplace";
import AdminRoyaltiesPage from "@/pages/admin-royalties";
import EventHistoryPage from "@/pages/event-history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/ai-dj" component={AIDJPage} />
      <Route path="/console" component={DJConsole} />
      <Route path="/party" component={PartyMode} />
      <Route path="/party/:eventCode" component={CrowdPage} />
      <Route path="/setlist/:eventCode" component={SetlistPage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/compliance" component={CompliancePage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/artist/dashboard" component={ArtistDashboard} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/admin/royalties" component={AdminRoyaltiesPage} />
      <Route path="/event-history" component={EventHistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
