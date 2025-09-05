import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RequestCard from "@/components/RequestCard";
import PremiseSelector from "@/components/PremiseSelector";
import Layout from "@/components/Layout";
import { Plus, Clock, CheckCircle, Building } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function TenantDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPremiseId, setSelectedPremiseId] = useState<string>("");

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/tenant"],
    enabled: !!user,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["/api/maintenance-requests"],
    enabled: !!user,
  });

  const handleNewRequest = () => {
    setLocation("/requests/new");
  };

  const handleRequestClick = (requestId: string) => {
    setLocation(`/requests/${requestId}`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your maintenance requests and properties</p>
          </div>
          <div className="flex-shrink-0">
            <PremiseSelector 
              selectedPremiseId={selectedPremiseId}
              onPremiseChange={setSelectedPremiseId}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button
          onClick={handleNewRequest}
          className="p-6 h-auto text-left group"
          data-testid="button-new-request"
        >
          <div className="flex items-center space-x-3">
            <Plus className="text-2xl" />
            <div>
              <h3 className="font-semibold">New Request</h3>
              <p className="text-sm text-primary-foreground/80">Submit maintenance request</p>
            </div>
          </div>
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Clock className="text-2xl text-yellow-500" />
              <div>
                <h3 className="font-semibold text-foreground">Pending</h3>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-pending">
                  {stats?.pendingRequests || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-2xl text-green-500" />
              <div>
                <h3 className="font-semibold text-foreground">Completed</h3>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-completed">
                  {stats?.completedRequests || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties and Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Properties */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">My Properties</h3>
              <div className="space-y-3">
                {properties.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No properties assigned</p>
                ) : (
                  properties.map((property: any) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      data-testid={`property-${property.id}`}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {property.unitNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {property.building.name}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {property.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Recent Requests</h3>
                <Button variant="ghost" size="sm" data-testid="button-view-all">
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="mx-auto h-12 w-12 mb-4" />
                    <p>No maintenance requests yet</p>
                    <Button
                      onClick={handleNewRequest}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      data-testid="button-create-first-request"
                    >
                      Create your first request
                    </Button>
                  </div>
                ) : (
                  requests.slice(0, 3).map((request: any) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => handleRequestClick(request.id)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </Layout>
  );
}
