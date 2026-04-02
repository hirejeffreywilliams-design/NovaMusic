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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/ai-dj" component={AIDJPage} />
      <Route path="/console" component={DJConsole} />
      <Route path="/party" component={PartyMode} />
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
