import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { User, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface RequestCardProps {
  request: {
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    property: {
      unitNumber: string;
      building: {
        name: string;
      };
    };
    assignedTechnician?: {
      firstName?: string;
      lastName?: string;
    };
  };
  onClick?: () => void;
}

export default function RequestCard({ request, onClick }: RequestCardProps) {
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer" 
      onClick={onClick}
      data-testid={`card-request-${request.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-foreground">{request.title}</h4>
            <p className="text-sm text-muted-foreground">
              {request.property.building.name} • {request.property.unitNumber} • {request.requestNumber}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <PriorityBadge priority={request.priority} />
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar size={12} className="mr-1" />
              <span>{format(new Date(request.createdAt), "MMM dd, yyyy")}</span>
            </div>
            {request.assignedTechnician && (
              <div className="flex items-center">
                <User size={12} className="mr-1" />
                <span>
                  {request.assignedTechnician.firstName} {request.assignedTechnician.lastName}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
