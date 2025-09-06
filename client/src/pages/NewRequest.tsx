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
import { Calendar } from "@/components/Calendar";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
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
  const [currentStep, setCurrentStep] = useState(0);
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

  const steps = [
    {
      title: "Property & Category",
      description: "Select your property and issue category",
    },
    {
      title: "Issue Details",
      description: "Describe the maintenance issue",
    },
    {
      title: "Photos & Evidence",
      description: "Upload photos or videos of the issue",
    },
    {
      title: "Scheduling",
      description: "Set your availability preferences",
    },
    {
      title: "Review & Submit",
      description: "Review your request before submitting",
    },
  ];

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setLocation("/");
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getTimeSlotLabel = (timeSlotId: string): string => {
    const timeSlotLabels: Record<string, string> = {
      "morning-early": "Early Morning (8:00-10:00 AM)",
      "morning-late": "Late Morning (10:00 AM-12:00 PM)",
      "afternoon-early": "Early Afternoon (12:00-2:00 PM)",
      "afternoon-late": "Late Afternoon (2:00-4:00 PM)",
      "afternoon-end": "End of Day (4:00-6:00 PM)",
      "evening": "Evening (6:00-8:00 PM)",
      "any": "Any time",
      "morning": "Morning (8AM-12PM)",
      "afternoon": "Afternoon (12PM-6PM)",
    };
    return timeSlotLabels[timeSlotId] || timeSlotId;
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Property & Category
        if (!formData.propertyId || !formData.category || !formData.priority) {
          toast({
            title: "Validation Error",
            description: "Please complete all required fields before proceeding",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 1: // Issue Details
        if (!formData.title || !formData.description) {
          toast({
            title: "Validation Error",
            description: "Please provide a title and detailed description",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2: // Photos (optional)
        return true;
      case 3: // Scheduling (optional)
        return true;
      case 4: // Review & Submit
        return true;
      default:
        return true;
    }
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Property & Category</h2>
            
            {/* Property Selection */}
            <div>
              <Label htmlFor="property">Select Property *</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => handleInputChange("propertyId", value)}
                required
              >
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Choose your property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 ? (
                    <SelectItem value="no-properties" disabled>
                      No properties available
                    </SelectItem>
                  ) : (
                    properties.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.building.name} - Unit {property.unitNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Issue Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
                required
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="What type of issue is this?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hvac">🌡️ HVAC (Heating/Cooling)</SelectItem>
                  <SelectItem value="plumbing">🚿 Plumbing</SelectItem>
                  <SelectItem value="electrical">⚡ Electrical</SelectItem>
                  <SelectItem value="general">🔧 General Maintenance</SelectItem>
                  <SelectItem value="appliances">📱 Appliances</SelectItem>
                  <SelectItem value="elevator">🛗 Elevator</SelectItem>
                  <SelectItem value="security">🔒 Security</SelectItem>
                  <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                  <SelectItem value="other">❓ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority Level *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
                required
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low - Can wait a few days</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Needs attention soon</SelectItem>
                  <SelectItem value="high">🟠 High - Urgent issue</SelectItem>
                  <SelectItem value="urgent">🔴 Emergency - Immediate attention needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Describe the Issue</h2>
            
            {/* Title */}
            <div>
              <Label htmlFor="title">Issue Summary *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Brief description (e.g., 'Leaky faucet in bathroom')"
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
                placeholder="Please provide as much detail as possible:
• When did the issue start?
• How often does it occur?
• Any specific symptoms or behaviors?
• Have you tried anything to fix it?"
                rows={6}
                required
                data-testid="textarea-description"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Detailed descriptions help our technicians prepare better and resolve issues faster.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Upload Photos or Videos</h2>
            
            <div>
              <Label>Visual Evidence (Optional but Recommended)</Label>
              <FileUpload
                onFilesChange={setFiles}
                maxFiles={10}
                maxFileSize={50 * 1024 * 1024} // 50MB
                acceptedTypes={["image/*", "video/*"]}
              />
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📸 Photo Tips:</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Take photos from multiple angles</li>
                  <li>• Include close-ups of the problem area</li>
                  <li>• Show the overall context/location</li>
                  <li>• Capture any error codes or warning lights</li>
                  <li>• Videos are great for showing intermittent issues</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Schedule Your Service</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <Label className="text-base font-medium mb-3 block">Select Preferred Date</Label>
                <div className="border rounded-lg">
                  <Calendar
                    mode="single"
                    selected={formData.preferredDate ? new Date(formData.preferredDate) : undefined}
                    onSelect={(date) => {
                      handleInputChange("preferredDate", date ? date.toISOString().split('T')[0] : "");
                      // Reset time slot when date changes
                      handleInputChange("preferredTimeSlot", "");
                    }}
                    disablePastDates={true}
                    className="w-full"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Select your preferred date for the maintenance visit
                </p>
              </div>
              
              {/* Time Slots */}
              <div>
                <Label className="text-base font-medium mb-3 block">Choose Time Slot</Label>
                <TimeSlotPicker
                  selectedDate={formData.preferredDate ? new Date(formData.preferredDate) : undefined}
                  selectedTimeSlot={formData.preferredTimeSlot}
                  onTimeSlotChange={(timeSlot) => handleInputChange("preferredTimeSlot", timeSlot)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="schedulingNotes">Special Instructions & Access Information</Label>
              <Textarea
                id="schedulingNotes"
                value={formData.schedulingNotes}
                onChange={(e) => handleInputChange("schedulingNotes", e.target.value)}
                placeholder="Please provide any special instructions for our technicians:

• Building access codes or key pickup locations
• Pet information (friendly/aggressive pets, where they'll be during service)
• Preferred contact method (call/text/WhatsApp)
• Any access restrictions or building policies
• Parking instructions
• Other scheduling preferences or constraints"
                rows={6}
                data-testid="textarea-scheduling-notes"
              />
            </div>
            
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">💡 Scheduling Tips:</h3>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• Morning slots (8AM-12PM) are usually available sooner</li>
                <li>• Flexible timing helps us schedule you faster</li>
                <li>• Emergency/urgent requests get priority scheduling</li>
                <li>• We'll send confirmation 24 hours before your appointment</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Review Your Request</h2>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">PROPERTY</h3>
                  <p className="text-sm">
                    {properties.find((p: any) => p.id === formData.propertyId)?.building?.name} - 
                    Unit {properties.find((p: any) => p.id === formData.propertyId)?.unitNumber}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">CATEGORY</h3>
                  <p className="text-sm capitalize">{formData.category}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">PRIORITY</h3>
                  <p className="text-sm capitalize">{formData.priority}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">FILES ATTACHED</h3>
                  <p className="text-sm">{files.length} file(s)</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">ISSUE SUMMARY</h3>
                <p className="text-sm">{formData.title}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">DESCRIPTION</h3>
                <p className="text-sm whitespace-pre-wrap">{formData.description}</p>
              </div>
              
              {(formData.preferredDate || formData.preferredTimeSlot) && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">PREFERRED SCHEDULE</h3>
                  <p className="text-sm">
                    {formData.preferredDate && `Date: ${formData.preferredDate}`}
                    {formData.preferredDate && formData.preferredTimeSlot && ", "}
                    {formData.preferredTimeSlot && `Time Slot: ${getTimeSlotLabel(formData.preferredTimeSlot)}`}
                  </p>
                </div>
              )}
              
              {formData.schedulingNotes && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400">SCHEDULING NOTES</h3>
                  <p className="text-sm whitespace-pre-wrap">{formData.schedulingNotes}</p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✅ Your request will be reviewed by our maintenance team</li>
                <li>📞 We'll contact you to confirm scheduling</li>
                <li>🔧 A qualified technician will be assigned</li>
                <li>📱 You'll receive updates via notifications</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
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
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">Create Maintenance Request</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].description}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index < currentStep
                        ? "bg-green-500 text-white"
                        : index === currentStep
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {index < currentStep ? "✓" : index + 1}
                  </div>
                  <span className="text-xs mt-1 text-center hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            {currentStep === 4 ? (
              <form onSubmit={handleSubmit}>
                {renderStep()}
                <div className="flex justify-between mt-8 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRequestMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                {renderStep()}
                <div className="flex justify-between mt-8 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    {currentStep === 0 ? "Cancel" : "Previous"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    data-testid="button-next"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
