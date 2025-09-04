import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { Clock, MapPin, Camera, Calendar, User, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TechnicianView() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/technician"],
    enabled: !!user && user.role === "fmc_technician",
  });

  const { data: assignedTasks = [] } = useQuery({
    queryKey: ["/api/maintenance-requests"],
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      await apiRequest("PATCH", `/api/maintenance-requests/${requestId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/technician"] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartTask = (requestId: string) => {
    updateStatusMutation.mutate({ requestId, status: "in_progress" });
  };

  const handleTaskClick = (requestId: string) => {
    setLocation(`/requests/${requestId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 bg-card border-b border-border shadow-sm z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">My Tasks</h1>
              <p className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName} - Technician
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="stat-assigned">
                {stats?.assigned || 0}
              </p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="stat-in-progress">
                {stats?.inProgress || 0}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="stat-completed">
                {stats?.completed || 0}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 space-y-4">
        <h2 className="font-semibold text-foreground">Today's Tasks</h2>

        {assignedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tasks assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          assignedTasks.map((task: any) => (
            <Card key={task.id} className="shadow-sm" data-testid={`card-task-${task.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm">{task.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {task.property.building.name} - {task.property.unitNumber}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-2" size={12} />
                    <span>Created: {format(new Date(task.createdAt), "MMM dd, h:mm a")}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="mr-2" size={12} />
                    <span>{task.property.unitNumber}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {task.status === "assigned" ? (
                    <Button
                      onClick={() => handleStartTask(task.id)}
                      className="flex-1 text-sm font-medium"
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-start-task-${task.id}`}
                    >
                      Start Task
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleTaskClick(task.id)}
                      className="flex-1 text-sm font-medium"
                      data-testid={`button-update-progress-${task.id}`}
                    >
                      Update Progress
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTaskClick(task.id)}
                    data-testid={`button-camera-${task.id}`}
                  >
                    <Camera size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 text-primary" data-testid="nav-tasks">
            <CheckCircle className="text-lg mb-1" />
            <span className="text-xs">Tasks</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="nav-schedule">
            <Calendar className="text-lg mb-1" />
            <span className="text-xs">Schedule</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="nav-camera">
            <Camera className="text-lg mb-1" />
            <span className="text-xs">Camera</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="nav-profile">
            <User className="text-lg mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
