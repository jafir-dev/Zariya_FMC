import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUpload from "@/components/FileUpload";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface FormData {
  propertyId: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  preferredDate: string;
  preferredTimeSlot: string;
  schedulingNotes: string;
}

export default function NewRequest() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<FormData>({
    propertyId: "",
    category: "",
    priority: "medium",
    title: "",
    description: "",
    preferredDate: "",
    preferredTimeSlot: "",
    schedulingNotes: "",
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (requestData: FormData) => {
      const response = await apiRequest("POST", "/api/maintenance-requests", requestData);
      return response.json();
    },
    onSuccess: async (newRequest) => {
      // Upload files if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        formData.append("isBeforePhoto", "true");

        await fetch(`/api/maintenance-requests/${newRequest.id}/attachments`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/tenant"] });
      toast({
        title: "Success",
        description: "Maintenance request created successfully",
      });
      setLocation("/");
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

  const handleBack = () => {
    setLocation("/");
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyId || !formData.category || !formData.title || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mr-4"
              data-testid="button-back"
            >
              <ArrowLeft className="text-muted-foreground" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Create Maintenance Request</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>New Maintenance Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Selection */}
              <div>
                <Label htmlFor="property">Property *</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(value) => handleInputChange("propertyId", value)}
                  required
                >
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.length === 0 ? (
                      <SelectItem value="no-properties" disabled>
                        No properties available
                      </SelectItem>
                    ) : (
                      properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.building.name} - {property.unitNumber}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange("category", value)}
                  required
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="general">General Maintenance</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="elevator">Elevator</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange("priority", value)}
                  required
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait a few days</SelectItem>
                    <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                    <SelectItem value="high">High - Urgent issue</SelectItem>
                    <SelectItem value="urgent">Urgent - Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Request Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                  data-testid="input-title"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Please provide as much detail as possible about the issue..."
                  rows={4}
                  required
                  data-testid="textarea-description"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Photos/Videos</Label>
                <FileUpload
                  onFilesChange={setFiles}
                  maxFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  acceptedTypes={["image/*", "video/*"]}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Upload photos or videos to help us understand the issue better
                </p>
              </div>

              {/* Availability */}
              <div>
                <Label>Preferred Schedule</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="preferredDate" className="text-xs text-muted-foreground">
                      Preferred Date
                    </Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => handleInputChange("preferredDate", e.target.value)}
                      className="text-sm"
                      data-testid="input-preferred-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredTimeSlot" className="text-xs text-muted-foreground">
                      Preferred Time
                    </Label>
                    <Select
                      value={formData.preferredTimeSlot}
                      onValueChange={(value) => handleInputChange("preferredTimeSlot", value)}
                    >
                      <SelectTrigger className="text-sm" data-testid="select-time-slot">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any time</SelectItem>
                        <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 6PM)</SelectItem>
                        <SelectItem value="evening">Evening (6PM - 8PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-2">
                  <Textarea
                    value={formData.schedulingNotes}
                    onChange={(e) => handleInputChange("schedulingNotes", e.target.value)}
                    placeholder="Additional scheduling notes or access instructions..."
                    rows={2}
                    className="text-sm"
                    data-testid="textarea-scheduling-notes"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  data-testid="button-submit"
                >
                  {createRequestMutation.isPending ? "Creating..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
