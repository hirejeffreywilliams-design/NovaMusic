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
import PrivacyPolicy from "@/pages/privacy";
import DmcaPolicy from "@/pages/dmca";
import { CookieBanner } from "@/components/cookie-banner";
import SetupGuide from "@/pages/setup-guide";
import LoginPage from "@/pages/login";
import DiscoverPage from "@/pages/discover";
import ChartsPage from "@/pages/charts";
import PlaylistsPage from "@/pages/playlists";
import LiveStreamsPage from "@/pages/live-streams";
import ConcertsPage from "@/pages/concerts";
import MerchStorePage from "@/pages/merch-store";
import BeatMakerPage from "@/pages/beat-maker";
import ArtistProfilePage from "@/pages/artist-profile";
import AdminUsersPage from "@/pages/admin-users";
import SearchPage from "@/pages/search";
import ProfilePage from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/charts" component={ChartsPage} />
      <Route path="/playlists" component={PlaylistsPage} />
      <Route path="/live" component={LiveStreamsPage} />
      <Route path="/concerts" component={ConcertsPage} />
      <Route path="/merch" component={MerchStorePage} />
      <Route path="/beat-maker" component={BeatMakerPage} />
      <Route path="/artist/:id" component={ArtistProfilePage} />
      <Route path="/artist/dashboard" component={ArtistDashboard} />
      <Route path="/ai-dj" component={AIDJPage} />
      <Route path="/console" component={DJConsole} />
      <Route path="/party" component={PartyMode} />
      <Route path="/party/:eventCode" component={CrowdPage} />
      <Route path="/setlist/:eventCode" component={SetlistPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/royalties" component={AdminRoyaltiesPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/event-history" component={EventHistoryPage} />
      <Route path="/compliance" component={CompliancePage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/dmca" component={DmcaPolicy} />
      <Route path="/setup-guide" component={SetupGuide} />
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
        <CookieBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
