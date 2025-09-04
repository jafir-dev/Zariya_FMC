import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import MasterDashboard from "@/pages/MasterDashboard";
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
          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/" component={MasterDashboard} />
              <Route path="/admin" component={MasterDashboard} />
            </>
          )}
          
          {/* FMC Head Routes */}
          {user?.role === 'fmc_head' && (
            <>
              <Route path="/" component={MasterDashboard} />
              <Route path="/admin" component={MasterDashboard} />
            </>
          )}
          
          {/* Tenant Routes */}
          {user?.role === 'tenant' && (
            <>
              <Route path="/" component={TenantDashboard} />
              <Route path="/tenant" component={TenantDashboard} />
              <Route path="/requests/new" component={NewRequest} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
          
          {/* FMC Supervisor Routes */}
          {user?.role === 'fmc_supervisor' && (
            <>
              <Route path="/" component={SupervisorDashboard} />
              <Route path="/supervisor" component={SupervisorDashboard} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
          
          {/* FMC Technician Routes */}
          {user?.role === 'fmc_technician' && (
            <>
              <Route path="/" component={TechnicianView} />
              <Route path="/technician" component={TechnicianView} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
          
          {/* Building Owner Routes */}
          {user?.role === 'building_owner' && (
            <>
              <Route path="/" component={TenantDashboard} />
              <Route path="/owner" component={TenantDashboard} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
          
          {/* FMC Procurement Routes */}
          {user?.role === 'fmc_procurement' && (
            <>
              <Route path="/" component={SupervisorDashboard} />
              <Route path="/procurement" component={SupervisorDashboard} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
          
          {/* Third Party Support Routes */}
          {user?.role === 'third_party_support' && (
            <>
              <Route path="/" component={TechnicianView} />
              <Route path="/support" component={TechnicianView} />
              <Route path="/requests/:id" component={RequestDetail} />
            </>
          )}
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
