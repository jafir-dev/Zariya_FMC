import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";

export default function Navigation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleRoleSwitch = (view: string) => {
    switch (view) {
      case "tenant":
        setLocation("/tenant");
        break;
      case "supervisor":
        setLocation("/supervisor");
        break;
      case "technician":
        setLocation("/technician");
        break;
      default:
        setLocation("/");
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Settings className="text-sm text-primary-foreground" size={16} />
              </div>
              <span className="ml-2 text-xl font-bold text-foreground">Zariya FMC</span>
            </div>

            {/* Role Selector - Only show if user has multiple roles */}
            {((user?.role === "fmc_supervisor" || user?.role === "fmc_head") || 
              (user?.role === "fmc_technician")) && (
              <div className="hidden md:block">
                <Select onValueChange={handleRoleSwitch} defaultValue={
                  user?.role === "fmc_supervisor" || user?.role === "fmc_head" ? "supervisor" :
                  user?.role === "fmc_technician" ? "technician" : "tenant"
                }>
                  <SelectTrigger className="w-40" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(user?.role === "fmc_supervisor" || user?.role === "fmc_head") && (
                      <SelectItem value="supervisor">FMC Supervisor</SelectItem>
                    )}
                    {user?.role === "fmc_technician" && (
                      <SelectItem value="technician">Technician</SelectItem>
                    )}
                    <SelectItem value="tenant">Tenant View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell size={20} />
              {/* Only show notification badge if there are notifications */}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">
                      {getInitials(user?.firstName, user?.lastName)}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem data-testid="menu-profile">
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-notifications">
                  Notification Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
