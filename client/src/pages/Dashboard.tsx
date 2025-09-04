import { useAuth } from "@/hooks/useAuth";
import TenantDashboard from "./TenantDashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import TechnicianView from "./TechnicianView";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case "tenant":
        return <TenantDashboard />;
      case "fmc_supervisor":
      case "fmc_head":
        return <SupervisorDashboard />;
      case "fmc_technician":
        return <TechnicianView />;
      default:
        return <TenantDashboard />;
    }
  };

  return <Layout>{renderDashboard()}</Layout>;
}
