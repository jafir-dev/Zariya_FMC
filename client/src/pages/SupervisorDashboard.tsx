import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardList, Users, Clock, Building, Download, Search } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/supervisor"],
    enabled: !!user && (user.role === "fmc_supervisor" || user.role === "fmc_head"),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ["/api/buildings"],
    enabled: !!user,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["/api/maintenance-requests", { status: statusFilter, building: buildingFilter }],
    enabled: !!user,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/technicians"],
    enabled: !!user,
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ requestId, technicianId }: { requestId: string; technicianId: string }) => {
      await apiRequest("PATCH", `/api/maintenance-requests/${requestId}/assign`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      toast({
        title: "Success",
        description: "Technician assigned successfully",
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

  const handleRequestClick = (requestId: string) => {
    setLocation(`/requests/${requestId}`);
  };

  const handleAssignTechnician = (requestId: string, technicianId: string) => {
    assignTechnicianMutation.mutate({ requestId, technicianId });
  };

  const filteredRequests = requests.filter((request: any) => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesBuilding = buildingFilter === "all" || request.property.building.id === buildingFilter;
    
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Supervisor Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage requests, assign technicians, and monitor building operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="text-2xl text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Open Requests</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-open-requests">
                  {stats?.openRequests || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="text-2xl text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Technicians</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-active-technicians">
                  {stats?.activeTechnicians || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="text-2xl text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-response-time">
                  {stats?.avgResponseTimeHours || 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="text-2xl text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Buildings Managed</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-buildings-managed">
                  {stats?.buildingsManaged || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-building-filter">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((building: any) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" data-testid="button-export">
              <Download className="mr-2" size={16} />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Maintenance Requests</h3>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Building/Unit</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request: any) => (
                    <TableRow 
                      key={request.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleRequestClick(request.id)}
                      data-testid={`row-request-${request.id}`}
                    >
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-foreground">{request.title}</div>
                          <div className="text-sm text-muted-foreground">{request.requestNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">{request.property.building.name}</div>
                        <div className="text-sm text-muted-foreground">{request.property.unitNumber}</div>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={request.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {request.assignedTechnician 
                          ? `${request.assignedTechnician.firstName} ${request.assignedTechnician.lastName}`
                          : "Unassigned"
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), "MMM dd, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {!request.assignedTechnician ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequest(request.id);
                                  }}
                                  data-testid={`button-assign-${request.id}`}
                                >
                                  Assign
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Technician</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm font-medium mb-2">Select Technician:</p>
                                    <Select 
                                      onValueChange={(technicianId) => {
                                        if (selectedRequest) {
                                          handleAssignTechnician(selectedRequest, technicianId);
                                          setSelectedRequest(null);
                                        }
                                      }}
                                    >
                                      <SelectTrigger data-testid="select-technician">
                                        <SelectValue placeholder="Choose technician" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {technicians.map((technician: any) => (
                                          <SelectItem key={technician.id} value={technician.id}>
                                            {technician.firstName} {technician.lastName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestClick(request.id);
                              }}
                              data-testid={`button-view-${request.id}`}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
