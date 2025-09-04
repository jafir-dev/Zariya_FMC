import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import FileUpload from "@/components/FileUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Plus,
  CheckCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updateNote, setUpdateNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");

  const { data: request, isLoading } = useQuery({
    queryKey: ["/api/maintenance-requests", id],
    enabled: !!id,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/technicians"],
    enabled: !!user && (user.role === "fmc_supervisor" || user.role === "fmc_head"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      await apiRequest("PATCH", `/api/maintenance-requests/${id}/status`, { status });
      if (note) {
        // Add note to timeline if needed
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      setUpdateNote("");
      setSelectedStatus("");
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ technicianId }: { technicianId: string }) => {
      await apiRequest("PATCH", `/api/maintenance-requests/${id}/assign`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      setSelectedTechnician("");
      toast({
        title: "Success",
        description: "Technician assigned successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async ({ files, isBeforePhoto }: { files: File[]; isBeforePhoto: boolean }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("isBeforePhoto", isBeforePhoto.toString());

      const response = await fetch(`/api/maintenance-requests/${id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      toast({
        title: "Success",
        description: "Files uploaded successfully",
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

  const handleBack = () => {
    setLocation("/");
  };

  const handleStatusUpdate = () => {
    if (selectedStatus) {
      updateStatusMutation.mutate({ status: selectedStatus, note: updateNote });
    }
  };

  const handleTechnicianAssign = () => {
    if (selectedTechnician) {
      assignTechnicianMutation.mutate({ technicianId: selectedTechnician });
    }
  };

  const handleFileUpload = (files: File[], isBeforePhoto: boolean = false) => {
    if (files.length > 0) {
      uploadFilesMutation.mutate({ files, isBeforePhoto });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested maintenance request could not be found.</p>
          <Button onClick={handleBack} data-testid="button-back-to-dashboard">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const canUpdateStatus = user?.role === "fmc_supervisor" || user?.role === "fmc_head" || user?.role === "fmc_technician";
  const canAssignTechnician = user?.role === "fmc_supervisor" || user?.role === "fmc_head";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Back Button */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mr-4"
          data-testid="button-back"
        >
          <ArrowLeft className="text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{request.title}</h1>
          <p className="text-muted-foreground">
            {request.requestNumber} • Created {format(new Date(request.createdAt), "MMMM dd, yyyy")}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Request Details</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Property:</span>
                  <span className="text-sm text-foreground text-right">
                    {request.property.building.name} - {request.property.unitNumber}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                  <PriorityBadge priority={request.priority} />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Category:</span>
                  <span className="text-sm text-foreground capitalize">{request.category}</span>
                </div>
                {request.preferredDate && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Preferred Date:</span>
                    <span className="text-sm text-foreground">
                      {format(new Date(request.preferredDate), "MMMM dd, yyyy")}
                    </span>
                  </div>
                )}
                {request.preferredTimeSlot && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Preferred Time:</span>
                    <span className="text-sm text-foreground">{request.preferredTimeSlot}</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">{request.description}</p>
              </div>

              {request.schedulingNotes && (
                <div className="mt-4">
                  <h4 className="font-medium text-foreground mb-2">Additional Notes</h4>
                  <p className="text-muted-foreground text-sm">{request.schedulingNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos and Documentation */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Documentation</h3>

              {/* Initial Photos */}
              <div className="mb-6">
                <h4 className="font-medium text-foreground mb-3">Initial Photos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.attachments
                    ?.filter((attachment: any) => attachment.isBeforePhoto)
                    .map((attachment: any) => (
                      <div key={attachment.id} className="relative group">
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="rounded-lg shadow-sm w-full h-24 object-cover cursor-pointer hover:shadow-md transition-shadow"
                          data-testid={`image-before-${attachment.id}`}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                </div>
                {(!request.attachments?.some((a: any) => a.isBeforePhoto)) && (
                  <p className="text-muted-foreground text-sm">No initial photos uploaded</p>
                )}
              </div>

              {/* Work Progress Photos */}
              <div className="mb-6">
                <h4 className="font-medium text-foreground mb-3">Work Progress Photos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.attachments
                    ?.filter((attachment: any) => !attachment.isBeforePhoto)
                    .map((attachment: any) => (
                      <div key={attachment.id} className="relative group">
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="rounded-lg shadow-sm w-full h-24 object-cover cursor-pointer hover:shadow-md transition-shadow"
                          data-testid={`image-after-${attachment.id}`}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                </div>
                {(!request.attachments?.some((a: any) => !a.isBeforePhoto)) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No work progress photos yet</p>
                  </div>
                )}
              </div>

              {/* File Upload for Technicians */}
              {(user?.role === "fmc_technician" && request.assignedTechnician?.id === user.id) && (
                <div className="mb-6">
                  <h4 className="font-medium text-foreground mb-3">Upload Work Photos</h4>
                  <FileUpload
                    onFilesChange={(files) => handleFileUpload(files, false)}
                    maxFiles={5}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Timeline</h3>

              <div className="flow-root">
                <ul className="-mb-8">
                  {request.timeline?.map((event: any, index: number) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {index !== request.timeline.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border"></span>
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-card">
                              {event.action === "created" && <Plus className="text-white text-xs" />}
                              {event.action === "status_updated" && <Eye className="text-white text-xs" />}
                              {event.action === "technician_assigned" && <User className="text-white text-xs" />}
                              {!["created", "status_updated", "technician_assigned"].includes(event.action) && (
                                <CheckCircle className="text-white text-xs" />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-foreground">
                                <strong>{event.user.firstName} {event.user.lastName}</strong> {event.description}
                              </p>
                              {event.newStatus && (
                                <p className="text-xs text-muted-foreground">
                                  Status changed to <StatusBadge status={event.newStatus} />
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                              {format(new Date(event.createdAt), "MMM dd, h:mm a")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Current Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <StatusBadge status={request.status} />
                  </div>
                  {request.assignedTechnician && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Technician:</span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {request.assignedTechnician.firstName} {request.assignedTechnician.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">Technician</p>
                      </div>
                    </div>
                  )}
                  {request.estimatedCompletionDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Est. Completion:</span>
                      <span className="text-sm text-foreground">
                        {format(new Date(request.estimatedCompletionDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {canUpdateStatus && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Actions</h3>
                  <div className="space-y-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          data-testid="button-update-status"
                        >
                          Update Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Request Status</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="status">New Status</Label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="note">Update Note (Optional)</Label>
                            <Textarea
                              id="note"
                              value={updateNote}
                              onChange={(e) => setUpdateNote(e.target.value)}
                              placeholder="Add a note about this status change..."
                              data-testid="textarea-update-note"
                            />
                          </div>
                          <Button
                            onClick={handleStatusUpdate}
                            disabled={!selectedStatus || updateStatusMutation.isPending}
                            className="w-full"
                            data-testid="button-confirm-status-update"
                          >
                            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {canAssignTechnician && !request.assignedTechnician && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full"
                            data-testid="button-assign-technician"
                          >
                            Assign Technician
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Technician</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="technician">Select Technician</Label>
                              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
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
                            <Button
                              onClick={handleTechnicianAssign}
                              disabled={!selectedTechnician || assignTechnicianMutation.isPending}
                              className="w-full"
                              data-testid="button-confirm-assign"
                            >
                              {assignTechnicianMutation.isPending ? "Assigning..." : "Assign Technician"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Request Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Request ID</p>
                    <p className="text-xs text-muted-foreground">{request.requestNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-2" size={12} />
                      <span>{request.property.building.name}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2" size={12} />
                      <span>Created {format(new Date(request.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                    {request.actualCompletionDate && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="mr-2" size={12} />
                        <span>Completed {format(new Date(request.actualCompletionDate), "MMM dd, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
