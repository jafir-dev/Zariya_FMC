import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building, Users, Key, Plus, Copy, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import Layout from '@/components/Layout';

interface InviteCode {
  id: string;
  code: string;
  role: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

interface Building {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isBuildingDialogOpen, setIsBuildingDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('');
  const [inviteExpires, setInviteExpires] = useState('7');
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');

  // Query invite codes
  const { data: inviteCodes = [] } = useQuery<InviteCode[]>({
    queryKey: ['/api/invite-codes'],
    enabled: !!user && ['admin', 'fmc_head', 'fmc_supervisor'].includes(user.role),
  });

  // Query buildings
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
    enabled: !!user,
  });

  // Create invite code mutation
  const createInviteMutation = useMutation({
    mutationFn: async ({ role, expiresIn }: { role: string; expiresIn: number }) => {
      const response = await apiRequest('POST', '/api/invite-codes', { role, expiresIn });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Invite Code Created',
        description: `Invite code ${data.code} created successfully`,
      });
      setIsInviteDialogOpen(false);
      setInviteRole('');
      setInviteExpires('7');
      queryClient.invalidateQueries({ queryKey: ['/api/invite-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invite code',
        variant: 'destructive',
      });
    },
  });

  // Create building mutation
  const createBuildingMutation = useMutation({
    mutationFn: async ({ name, address }: { name: string; address: string }) => {
      const response = await apiRequest('POST', '/api/buildings', { name, address });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Building Created',
        description: 'Building created successfully',
      });
      setIsBuildingDialogOpen(false);
      setBuildingName('');
      setBuildingAddress('');
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create building',
        variant: 'destructive',
      });
    },
  });

  const handleCreateInvite = () => {
    if (!inviteRole) {
      toast({
        title: 'Validation Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    createInviteMutation.mutate({ 
      role: inviteRole, 
      expiresIn: parseInt(inviteExpires) 
    });
  };

  const handleCreateBuilding = () => {
    if (!buildingName || !buildingAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    createBuildingMutation.mutate({ 
      name: buildingName, 
      address: buildingAddress 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Invite code copied to clipboard',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'fmc_head':
        return 'default';
      case 'fmc_supervisor':
        return 'secondary';
      case 'fmc_technician':
        return 'outline';
      case 'tenant':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'fmc_head':
        return 'FMC Head';
      case 'fmc_supervisor':
        return 'Supervisor';
      case 'fmc_technician':
        return 'Technician';
      case 'tenant':
        return 'Tenant';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  // Check if user has admin permissions
  if (!user || !['admin', 'fmc_head', 'fmc_supervisor'].includes(user.role)) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-2">Manage properties, users, and system settings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Building className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-foreground">Buildings</h3>
                  <p className="text-2xl font-bold text-foreground">{buildings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Key className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-foreground">Active Invites</h3>
                  <p className="text-2xl font-bold text-foreground">
                    {inviteCodes.filter(code => code.isActive && !code.usedBy).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-foreground">Used Invites</h3>
                  <p className="text-2xl font-bold text-foreground">
                    {inviteCodes.filter(code => code.usedBy).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invite Codes Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Invite Codes</span>
                </CardTitle>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Invite Code</DialogTitle>
                      <DialogDescription>
                        Generate an invite code for new users to join your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fmc_supervisor">Supervisor</SelectItem>
                            <SelectItem value="fmc_technician">Technician</SelectItem>
                            <SelectItem value="tenant">Tenant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Expires In (days)</Label>
                        <Select value={inviteExpires} onValueChange={setInviteExpires}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">1 week</SelectItem>
                            <SelectItem value="14">2 weeks</SelectItem>
                            <SelectItem value="30">1 month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateInvite}
                        disabled={createInviteMutation.isPending}
                      >
                        {createInviteMutation.isPending ? 'Creating...' : 'Create Invite'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {inviteCodes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No invite codes yet</p>
                ) : (
                  inviteCodes.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <code className="font-mono text-sm font-semibold">{invite.code}</code>
                          <Badge variant={getRoleBadgeColor(invite.role)}>
                            {getRoleDisplayName(invite.role)}
                          </Badge>
                          {invite.usedBy ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : new Date(invite.expiresAt) < new Date() ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Calendar className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {invite.usedBy 
                            ? `Used ${format(new Date(invite.usedAt!), 'MMM dd, yyyy')}`
                            : new Date(invite.expiresAt) < new Date()
                              ? 'Expired'
                              : `Expires ${format(new Date(invite.expiresAt), 'MMM dd, yyyy')}`
                          }
                        </p>
                      </div>
                      {!invite.usedBy && new Date(invite.expiresAt) > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(invite.code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Buildings Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Buildings</span>
                </CardTitle>
                <Dialog open={isBuildingDialogOpen} onOpenChange={setIsBuildingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Building
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Building</DialogTitle>
                      <DialogDescription>
                        Add a new building to your property portfolio.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Building Name</Label>
                        <Input
                          value={buildingName}
                          onChange={(e) => setBuildingName(e.target.value)}
                          placeholder="e.g., Skyline Towers"
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Textarea
                          value={buildingAddress}
                          onChange={(e) => setBuildingAddress(e.target.value)}
                          placeholder="Full building address"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBuildingDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateBuilding}
                        disabled={createBuildingMutation.isPending}
                      >
                        {createBuildingMutation.isPending ? 'Creating...' : 'Add Building'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {buildings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No buildings yet</p>
                ) : (
                  buildings.map((building) => (
                    <div key={building.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{building.name}</h4>
                        <Badge variant={building.isActive ? 'default' : 'secondary'}>
                          {building.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{building.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added {format(new Date(building.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}