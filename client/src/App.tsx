import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import TenantDashboard from "@/pages/TenantDashboard";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import TechnicianView from "@/pages/TechnicianView";
import RequestDetail from "@/pages/RequestDetail";
import NewRequest from "@/pages/NewRequest";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/tenant" component={TenantDashboard} />
          <Route path="/supervisor" component={SupervisorDashboard} />
          <Route path="/technician" component={TechnicianView} />
          <Route path="/requests/new" component={NewRequest} />
          <Route path="/requests/:id" component={RequestDetail} />
        </>
      )}
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
