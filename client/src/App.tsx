import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import MasterDashboard from "@/pages/MasterDashboard";
import TenantDashboard from "@/pages/TenantDashboard";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import TechnicianView from "@/pages/TechnicianView";
import RequestDetail from "@/pages/RequestDetail";
import NewRequest from "@/pages/NewRequest";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import ReportingDashboard from "@/pages/ReportingDashboard";

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
          {/* Common Routes for all authenticated users */}
          <Route path="/profile" component={Profile} />
          <Route path="/requests/new" component={NewRequest} />
          <Route path="/requests/:id" component={RequestDetail} />
          
          {/* Analytics Dashboard - Admin and Supervisors only */}
          {['admin', 'fmc_head', 'fmc_supervisor'].includes(user?.role || '') && (
            <Route path="/reports" component={ReportingDashboard} />
          )}
          
          {/* Admin Dashboard - Admin and FMC Head only */}
          {['admin', 'fmc_head'].includes(user?.role || '') && (
            <Route path="/admin" component={AdminDashboard} />
          )}
          
          {/* Role-based dashboard routing using the universal Dashboard component */}
          <Route path="/" component={Dashboard} />
          
          {/* Legacy role-specific routes for backward compatibility */}
          <Route path="/tenant" component={TenantDashboard} />
          <Route path="/supervisor" component={SupervisorDashboard} />
          <Route path="/technician" component={TechnicianView} />
          <Route path="/master" component={MasterDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
